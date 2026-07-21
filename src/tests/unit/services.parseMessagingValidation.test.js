const mockRegistry = {};
let mockMembers = [];
let mockMessages = [];

class MockACL {
  constructor() {
    this.read = {};
    this.write = {};
  }

  setReadAccess(userId, value) {
    this.read[userId] = value;
  }

  setWriteAccess(userId, value) {
    this.write[userId] = value;
  }
}

class MockFile {
  constructor(name) {
    this.name = name;
  }
}

class MockObject {
  constructor(className, id, attributes = {}) {
    this.className = className;
    this.id = id;
    this.attributes = { ...attributes };
    this.createdAt = attributes.createdAt;
    this.mockDirtyKeys = [];
  }

  dirtyKeys() {
    return this.mockDirtyKeys;
  }

  get(field) {
    return this.attributes[field];
  }

  set(field, value) {
    this.attributes[field] = value;
    return this;
  }

  setACL(acl) {
    this.acl = acl;
  }

  unset(field) {
    delete this.attributes[field];
  }
}

class MockParseObject extends MockObject {
  constructor(className) {
    super(className);
  }

  static createWithoutData(className, objectId) {
    return new MockParseObject(className, objectId);
  }

  static saveAll(objects) {
    return Promise.resolve(objects);
  }
}

class MockQuery {
  constructor(className) {
    this.className = className;
    this.constraints = {};
  }

  equalTo(field, value) {
    this.constraints[field] = value;
    return this;
  }

  notEqualTo() {
    return this;
  }

  include() {
    return this;
  }

  limit() {
    return this;
  }

  first() {
    if (this.className === 'ConversationMember') {
      return Promise.resolve(
        mockMembers.find(member => {
          const sameConversation =
            member.get('conversation').id === this.constraints.conversation.id;
          const sameUser = member.get('user').id === this.constraints.user.id;
          return sameConversation && sameUser && member.get('active');
        }),
      );
    }
    if (this.className === 'Message') {
      return Promise.resolve(
        mockMessages.find(message => {
          const sameConversation =
            message.get('conversation').id === this.constraints.conversation.id;
          const sameClientMessageId =
            message.get('clientMessageId') === this.constraints.clientMessageId;
          return sameConversation && sameClientMessageId;
        }),
      );
    }
    return Promise.resolve(undefined);
  }

  find() {
    if (this.className === 'ConversationMember') {
      return Promise.resolve(
        mockMembers.filter(
          member =>
            member.get('conversation').id === this.constraints.conversation.id &&
            member.get('active'),
        ),
      );
    }
    return Promise.resolve([]);
  }

  get(objectId) {
    if (typeof this.className === 'function') {
      return Promise.resolve({ id: objectId });
    }
    return Promise.resolve(mockRegistry[this.className][objectId]);
  }
}

const mockParse = {
  ACL: MockACL,
  File: MockFile,
  Object: MockParseObject,
  Query: MockQuery,
  User: class MockUser {},
};

jest.mock('../../providers/ParseProvider', () => ({
  __esModule: true,
  default: mockParse,
}));
jest.mock('../../services/PushService', () => ({
  __esModule: true,
  default: { sendMessagingPushNotification: jest.fn() },
}));

const ParseMessagingService = require('../../services/ParseMessagingService');

const user = id => ({ id });

const makeConversation = (creator = user('user-1')) =>
  new MockObject('Conversation', 'conversation-1', {
    creator,
    isDeleted: false,
    title: 'Conversation',
    type: 'direct',
  });

const makeMessage = (conversation, author, overrides = {}) =>
  new MockObject('Message', 'message-1', {
    attachments: [
      { byteCount: 10, file: new MockFile('image.jpg'), kind: 'image' },
    ],
    author,
    clientMessageId: 'client-message-1',
    contentType: 'image',
    conversation,
    deliveryType: 'respectful',
    isDeleted: false,
    isPinned: false,
    text: 'Hello',
    ...overrides,
  });

const installConversation = conversation => {
  mockRegistry.Conversation = { [conversation.id]: conversation };
};

const installMessage = message => {
  mockRegistry.Message = { [message.id]: message };
};

const installMember = (conversation, memberUser, role = 'member') => {
  const membership = new MockObject('ConversationMember', `member-${memberUser.id}`, {
    active: true,
    conversation,
    role,
    user: memberUser,
  });
  mockMembers.push(membership);
  return membership;
};

describe('Parse messaging write validation', () => {
  beforeEach(() => {
    Object.keys(mockRegistry).forEach(key => delete mockRegistry[key]);
    mockMembers = [];
    mockMessages = [];
  });

  test('rejects idempotency recovery owned by another member', async () => {
    const author = user('user-1');
    const otherMember = user('user-2');
    const conversation = makeConversation(author);
    installConversation(conversation);
    installMember(conversation, author, 'owner');
    installMember(conversation, otherMember);
    const existing = makeMessage(conversation, author);
    mockMessages = [existing];
    const params = {
      clientMessageId: existing.get('clientMessageId'),
      conversationId: conversation.id,
      text: 'A colliding retry',
    };

    await expect(
      ParseMessagingService.sendMessage(otherMember, params),
    ).rejects.toThrow('clientMessageId collision');
    await expect(
      ParseMessagingService.getMessageByClientId(otherMember, params),
    ).rejects.toThrow('clientMessageId collision');
    await expect(
      ParseMessagingService.getMessageByClientId(author, params),
    ).resolves.toBe(existing);
  });

  test('sets a message tombstone timestamp while retaining files for cleanup', async () => {
    const author = user('user-1');
    const conversation = makeConversation(author);
    installConversation(conversation);
    installMember(conversation, author, 'owner');

    const original = makeMessage(conversation, author);
    const message = makeMessage(conversation, author, { isDeleted: true });
    message.mockDirtyKeys = ['isDeleted'];

    await ParseMessagingService.beforeSaveMessage({
      object: message,
      original,
      user: author,
    });

    expect(message.get('deletedAt')).toBeInstanceOf(Date);
    expect(message.get('text')).toBe('');
    expect(message.get('attachments')).toHaveLength(1);
    expect(message.get('attachments')[0].file.name).toBe('image.jpg');
  });

  test('sets and clears pin timestamps consistently', async () => {
    const author = user('user-1');
    const conversation = makeConversation(author);
    installConversation(conversation);
    installMember(conversation, author, 'owner');

    const original = makeMessage(conversation, author);
    const pinned = makeMessage(conversation, author, { isPinned: true });
    pinned.mockDirtyKeys = ['isPinned'];
    await ParseMessagingService.beforeSaveMessage({
      object: pinned,
      original,
      user: author,
    });
    expect(pinned.get('pinnedAt')).toBeInstanceOf(Date);
    expect(pinned.get('pinnedBy')).toBe(author);

    const unpinned = makeMessage(conversation, author, {
      isPinned: false,
      pinnedAt: pinned.get('pinnedAt'),
      pinnedBy: author,
    });
    unpinned.mockDirtyKeys = ['isPinned'];
    await ParseMessagingService.beforeSaveMessage({
      object: unpinned,
      original: pinned,
      user: author,
    });
    expect(unpinned.get('pinnedAt')).toBeUndefined();
    expect(unpinned.get('pinnedBy')).toBeUndefined();
  });

  test('sets a conversation deletion timestamp and prevents client restore', async () => {
    const creator = user('user-1');
    const original = makeConversation(creator);
    const conversation = makeConversation(creator);
    conversation.set('isDeleted', true);
    conversation.mockDirtyKeys = ['isDeleted'];
    installConversation(conversation);
    installMember(conversation, creator, 'owner');

    await ParseMessagingService.beforeSaveConversation({
      object: conversation,
      original,
      user: creator,
    });
    expect(conversation.get('deletedAt')).toBeInstanceOf(Date);

    const restored = makeConversation(creator);
    restored.set('deletedAt', conversation.get('deletedAt'));
    restored.mockDirtyKeys = ['isDeleted'];
    await expect(
      ParseMessagingService.beforeSaveConversation({
        object: restored,
        original: conversation,
        user: creator,
      }),
    ).rejects.toThrow('cannot be modified');
  });

  test('rejects message edits by another active member', async () => {
    const author = user('user-1');
    const otherMember = user('user-2');
    const conversation = makeConversation(author);
    installConversation(conversation);
    installMember(conversation, author, 'owner');
    installMember(conversation, otherMember);

    const original = makeMessage(conversation, author);
    const edited = makeMessage(conversation, author, { text: 'Forged edit' });
    edited.mockDirtyKeys = ['text'];

    await expect(
      ParseMessagingService.beforeSaveMessage({
        object: edited,
        original,
        user: otherMember,
      }),
    ).rejects.toThrow('Only the author may edit or delete');
  });

  test('treats metadata as author-owned content', async () => {
    const author = user('user-1');
    const otherMember = user('user-2');
    const conversation = makeConversation(author);
    installConversation(conversation);
    installMember(conversation, author, 'owner');
    installMember(conversation, otherMember);
    const original = makeMessage(conversation, author, { metadata: {} });
    const edited = makeMessage(conversation, author, {
      metadata: { forged: true },
    });
    edited.mockDirtyKeys = ['metadata'];

    await expect(
      ParseMessagingService.beforeSaveMessage({
        object: edited,
        original,
        user: otherMember,
      }),
    ).rejects.toThrow('Only the author may edit or delete');
  });

  test('reserves onboarding suppression metadata for trusted seed writes', async () => {
    const author = user('user-1');
    const conversation = makeConversation(author);
    installConversation(conversation);
    installMember(conversation, author, 'owner');
    const message = makeMessage(conversation, author, {
      metadata: { onboarding: true, suppressPush: true },
    });
    message.mockDirtyKeys = ['metadata'];

    await expect(
      ParseMessagingService.beforeSaveMessage({
        object: message,
        user: author,
      }),
    ).rejects.toThrow('server-managed fields');
    await expect(
      ParseMessagingService.beforeSaveMessage({
        master: true,
        object: message,
      }),
    ).rejects.toThrow('server-managed fields');
    await expect(
      ParseMessagingService.beforeSaveMessage({
        context: { messagingOnboardingSeed: true },
        master: true,
        object: message,
      }),
    ).resolves.toBeUndefined();
  });

  test('rejects all client changes after a message is tombstoned', async () => {
    const author = user('user-1');
    const conversation = makeConversation(author);
    installConversation(conversation);
    installMember(conversation, author, 'owner');
    const original = makeMessage(conversation, author, {
      isDeleted: true,
      metadata: {},
      text: '',
    });
    const edited = makeMessage(conversation, author, {
      isDeleted: true,
      metadata: { edited: true },
      text: '',
    });
    edited.mockDirtyKeys = ['metadata'];

    await expect(
      ParseMessagingService.beforeSaveMessage({
        object: edited,
        original,
        user: author,
      }),
    ).rejects.toThrow('Deleted messages cannot be modified');
  });

  test('accepts only stable reaction types on direct saves', async () => {
    const author = user('user-1');
    const reactingUser = user('user-2');
    const conversation = makeConversation(author);
    installConversation(conversation);
    installMember(conversation, author, 'owner');
    installMember(conversation, reactingUser);
    const message = makeMessage(conversation, author);
    installMessage(message);

    const supported = new MockObject('MessageReaction', undefined, {
      message,
      type: 'love',
    });
    supported.mockDirtyKeys = ['message', 'type'];
    await expect(
      ParseMessagingService.beforeSaveReaction({
        object: supported,
        user: reactingUser,
      }),
    ).resolves.toBeUndefined();
    expect(supported.get('conversation')).toBe(conversation);
    expect(supported.get('user')).toBe(reactingUser);

    const unsupported = new MockObject('MessageReaction', undefined, {
      message,
      type: 'celebrate',
    });
    unsupported.mockDirtyKeys = ['message', 'type'];
    await expect(
      ParseMessagingService.beforeSaveReaction({
        object: unsupported,
        user: reactingUser,
      }),
    ).rejects.toThrow('type has an unsupported value');
  });

  test('rejects selected reactions targeting a deleted message', async () => {
    const author = user('user-1');
    const reactingUser = user('user-2');
    const conversation = makeConversation(author);
    installConversation(conversation);
    installMember(conversation, author, 'owner');
    installMember(conversation, reactingUser);
    const message = makeMessage(conversation, author, { isDeleted: true });
    installMessage(message);

    const directReaction = new MockObject('MessageReaction', undefined, {
      message,
      type: 'like',
    });
    directReaction.mockDirtyKeys = ['message', 'type'];
    await expect(
      ParseMessagingService.beforeSaveReaction({
        object: directReaction,
        user: reactingUser,
      }),
    ).rejects.toThrow('Cannot react to a deleted message');

    await expect(
      ParseMessagingService.addReaction(reactingUser, {
        messageId: message.id,
        type: 'dislike',
      }),
    ).rejects.toThrow('Cannot react to a deleted message');
  });

  test('rejects unsupported reaction types before the Cloud write path', async () => {
    const reactingUser = user('user-2');
    await expect(
      ParseMessagingService.addReaction(reactingUser, {
        messageId: 'message-1',
        type: 'read',
      }),
    ).rejects.toThrow('type has an unsupported value');
  });

  test('rejects direct hard deletion without the master key', () => {
    expect(() =>
      ParseMessagingService.beforeDeleteMessagingObject({ user: user('user-1') }),
    ).toThrow('cannot be hard-deleted');
  });

  test('rejects a receipt state moving backwards', async () => {
    const reader = user('user-1');
    const conversation = makeConversation(reader);
    installConversation(conversation);
    installMember(conversation, reader, 'owner');
    const message = makeMessage(conversation, reader, {
      createdAt: new Date(),
    });
    message.createdAt = new Date();
    installMessage(message);

    const original = new MockObject('MessageReceipt', 'receipt-1', {
      conversation,
      message,
      state: 'delivered',
      user: reader,
    });
    const receipt = new MockObject('MessageReceipt', 'receipt-1', {
      conversation,
      message,
      state: 'sent',
      user: reader,
    });
    receipt.mockDirtyKeys = ['state'];

    await expect(
      ParseMessagingService.beforeSaveReceipt({
        object: receipt,
        original,
        user: reader,
      }),
    ).rejects.toThrow('cannot move backwards');
  });

  test('allows a receipt owner to reverse read back to delivered', async () => {
    const reader = user('user-1');
    const conversation = makeConversation(reader);
    installConversation(conversation);
    installMember(conversation, reader, 'owner');
    const message = makeMessage(conversation, reader);
    message.createdAt = new Date();
    installMessage(message);
    const deliveredAt = new Date(Date.now() - 1000);
    const original = new MockObject('MessageReceipt', 'receipt-1', {
      conversation,
      deliveredAt,
      message,
      readAt: new Date(),
      state: 'read',
      user: reader,
    });
    const receipt = new MockObject('MessageReceipt', 'receipt-1', {
      conversation,
      deliveredAt,
      message,
      readAt: original.get('readAt'),
      state: 'delivered',
      user: reader,
    });
    receipt.mockDirtyKeys = ['state'];

    await ParseMessagingService.beforeSaveReceipt({
      object: receipt,
      original,
      user: reader,
    });
    expect(receipt.get('state')).toBe('delivered');
    expect(receipt.get('readAt')).toBeUndefined();
    expect(receipt.get('deliveredAt')).toBe(deliveredAt);
  });

  test('allows only an active member to set a short typing expiry', async () => {
    const memberUser = user('user-1');
    const conversation = makeConversation(memberUser);
    installConversation(conversation);
    const original = installMember(conversation, memberUser, 'owner');
    const member = new MockObject('ConversationMember', original.id, {
      active: true,
      conversation,
      role: 'owner',
      typingExpiresAt: new Date(Date.now() + 10000),
      user: memberUser,
    });
    member.mockDirtyKeys = ['typingExpiresAt'];
    mockMembers = [member];

    await ParseMessagingService.beforeSaveMember({
      object: member,
      original,
      user: memberUser,
    });
    expect(member.get('typingExpiresAt')).toBeInstanceOf(Date);

    const tooLong = new MockObject('ConversationMember', original.id, {
      active: true,
      conversation,
      role: 'owner',
      typingExpiresAt: new Date(Date.now() + 60000),
      user: memberUser,
    });
    tooLong.mockDirtyKeys = ['typingExpiresAt'];
    await expect(
      ParseMessagingService.beforeSaveMember({
        object: tooLong,
        original,
        user: memberUser,
      }),
    ).rejects.toThrow('no more than 15 seconds ahead');
  });

  test('prevents a conversation admin from forging another member typing', async () => {
    const owner = user('user-1');
    const target = user('user-2');
    const conversation = makeConversation(owner);
    installConversation(conversation);
    installMember(conversation, owner, 'owner');
    const original = installMember(conversation, target);
    const member = new MockObject('ConversationMember', original.id, {
      active: true,
      conversation,
      role: 'member',
      typingExpiresAt: new Date(Date.now() + 10000),
      user: target,
    });
    member.mockDirtyKeys = ['typingExpiresAt'];

    await expect(
      ParseMessagingService.beforeSaveMember({
        object: member,
        original,
        user: owner,
      }),
    ).rejects.toThrow('Only the member may update their typing state');
  });

  test('allows self-hide/show but prevents hiding another member', async () => {
    const owner = user('user-1');
    const memberUser = user('user-2');
    const conversation = makeConversation(owner);
    installConversation(conversation);
    installMember(conversation, owner, 'owner');
    const original = installMember(conversation, memberUser);
    const hidden = new MockObject('ConversationMember', original.id, {
      active: true,
      conversation,
      isHidden: true,
      role: 'member',
      user: memberUser,
    });
    hidden.mockDirtyKeys = ['isHidden'];

    await ParseMessagingService.beforeSaveMember({
      object: hidden,
      original,
      user: memberUser,
    });
    expect(hidden.get('hiddenAt')).toBeInstanceOf(Date);

    await expect(
      ParseMessagingService.beforeSaveMember({
        object: hidden,
        original,
        user: owner,
      }),
    ).rejects.toThrow('Only the member may update their hidden state');

    const shown = new MockObject('ConversationMember', original.id, {
      active: true,
      conversation,
      hiddenAt: hidden.get('hiddenAt'),
      isHidden: false,
      role: 'member',
      user: memberUser,
    });
    shown.mockDirtyKeys = ['isHidden'];
    await ParseMessagingService.beforeSaveMember({
      object: shown,
      original: hidden,
      user: memberUser,
    });
    expect(shown.get('hiddenAt')).toBeUndefined();
  });

  test('allows self-leave but requires a manager for reactivation', async () => {
    const owner = user('user-1');
    const memberUser = user('user-2');
    const conversation = makeConversation(owner);
    installConversation(conversation);
    installMember(conversation, owner, 'owner');
    const original = installMember(conversation, memberUser);
    const leaving = new MockObject('ConversationMember', original.id, {
      active: false,
      conversation,
      role: 'member',
      user: memberUser,
    });
    leaving.mockDirtyKeys = ['active'];
    await ParseMessagingService.beforeSaveMember({
      object: leaving,
      original,
      user: memberUser,
    });
    expect(leaving.get('leftAt')).toBeInstanceOf(Date);

    const reactivated = new MockObject('ConversationMember', original.id, {
      active: true,
      conversation,
      leftAt: leaving.get('leftAt'),
      role: 'member',
      user: memberUser,
    });
    reactivated.mockDirtyKeys = ['active'];
    mockMembers = mockMembers.filter(
      membership => membership.get('user').id !== memberUser.id,
    );
    await expect(
      ParseMessagingService.beforeSaveMember({
        object: reactivated,
        original: leaving,
        user: memberUser,
      }),
    ).rejects.toThrow('not an active conversation member');

    await ParseMessagingService.beforeSaveMember({
      object: reactivated,
      original: leaving,
      user: owner,
    });
    expect(reactivated.get('leftAt')).toBeUndefined();
  });

  test('accepts link-only messages and fileless link previews', async () => {
    const author = user('user-1');
    const conversation = makeConversation(author);
    installConversation(conversation);
    installMember(conversation, author, 'owner');

    const linkMessage = makeMessage(conversation, author, {
      attachments: [],
      contentType: 'link',
      linkURL: 'https://jibber.social/story',
      text: '',
    });
    linkMessage.mockDirtyKeys = [
      'clientMessageId',
      'contentType',
      'conversation',
      'deliveryType',
      'linkURL',
      'text',
    ];
    await expect(
      ParseMessagingService.beforeSaveMessage({
        object: linkMessage,
        user: author,
      }),
    ).resolves.toBeUndefined();

    const previewMessage = makeMessage(conversation, author, {
      attachments: [
        {
          kind: 'linkPreview',
          linkURL: 'https://jibber.social/preview',
        },
      ],
      contentType: 'media',
      text: '',
    });
    previewMessage.mockDirtyKeys = [
      'attachments',
      'clientMessageId',
      'contentType',
      'conversation',
      'deliveryType',
      'text',
    ];
    await expect(
      ParseMessagingService.beforeSaveMessage({
        object: previewMessage,
        user: author,
      }),
    ).resolves.toBeUndefined();
  });

  test('rejects fileless media attachments that are not link previews', async () => {
    const author = user('user-1');
    const conversation = makeConversation(author);
    installConversation(conversation);
    installMember(conversation, author, 'owner');
    const message = makeMessage(conversation, author, {
      attachments: [{ kind: 'image' }],
      contentType: 'media',
      text: '',
    });
    message.mockDirtyKeys = [
      'attachments',
      'clientMessageId',
      'contentType',
      'conversation',
      'deliveryType',
      'text',
    ];

    await expect(
      ParseMessagingService.beforeSaveMessage({ object: message, user: author }),
    ).rejects.toThrow('must reference a ParseFile');
  });

  test('allows append-only expressions authored by the active user', async () => {
    const author = user('user-1');
    const reactingUser = user('user-2');
    const conversation = makeConversation(author);
    installConversation(conversation);
    installMember(conversation, author, 'owner');
    installMember(conversation, reactingUser);
    const existingExpression = {
      authorId: author.id,
      expressionId: 'smile',
    };
    const original = makeMessage(conversation, author, {
      expressions: [existingExpression],
    });
    const updated = makeMessage(conversation, author, {
      expressions: [
        existingExpression,
        { authorId: reactingUser.id, expressionId: 'heart' },
      ],
    });
    updated.mockDirtyKeys = ['expressions'];

    await expect(
      ParseMessagingService.beforeSaveMessage({
        object: updated,
        original,
        user: reactingUser,
      }),
    ).resolves.toBeUndefined();

    const forged = makeMessage(conversation, author, {
      expressions: [
        existingExpression,
        { authorId: 'user-3', expressionId: 'heart' },
      ],
    });
    forged.mockDirtyKeys = ['expressions'];
    await expect(
      ParseMessagingService.beforeSaveMessage({
        object: forged,
        original,
        user: reactingUser,
      }),
    ).rejects.toThrow('authorId must match');

    const removed = makeMessage(conversation, author, { expressions: [] });
    removed.mockDirtyKeys = ['expressions'];
    await expect(
      ParseMessagingService.beforeSaveMessage({
        object: removed,
        original,
        user: reactingUser,
      }),
    ).rejects.toThrow('cannot be removed or edited');
  });

  test('allows active members to append expressions to a conversation', async () => {
    const creator = user('user-1');
    const memberUser = user('user-2');
    const original = makeConversation(creator);
    original.set('expressions', [
      { authorId: creator.id, expressionId: 'smile' },
    ]);
    const conversation = makeConversation(creator);
    conversation.set('expressions', [
      { authorId: creator.id, expressionId: 'smile' },
      { authorId: memberUser.id, expressionId: 'heart' },
    ]);
    conversation.mockDirtyKeys = ['expressions'];
    installConversation(conversation);
    installMember(conversation, creator, 'owner');
    installMember(conversation, memberUser);

    await expect(
      ParseMessagingService.beforeSaveConversation({
        object: conversation,
        original,
        user: memberUser,
      }),
    ).resolves.toBeUndefined();
  });

  test('accepts an expression as the only message content', async () => {
    const author = user('user-1');
    const conversation = makeConversation(author);
    installConversation(conversation);
    installMember(conversation, author, 'owner');
    const message = makeMessage(conversation, author, {
      attachments: [],
      contentType: 'text',
      expressions: [{ authorId: author.id, expressionId: 'heart' }],
      text: '',
    });
    message.mockDirtyKeys = [
      'clientMessageId',
      'contentType',
      'conversation',
      'deliveryType',
      'expressions',
      'text',
    ];

    await expect(
      ParseMessagingService.beforeSaveMessage({ object: message, user: author }),
    ).resolves.toBeUndefined();
  });
});
