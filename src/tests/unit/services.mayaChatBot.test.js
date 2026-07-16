/* eslint-disable max-classes-per-file */

const mockSendMessage = jest.fn();
let mockBotMembership;
let mockBotUser;
let mockMessages;
let mockMessagesById;
let mockThreadMessages;

class MockObject {
  constructor(className, id, attributes = {}) {
    this.className = className;
    this.id = id;
    this.attributes = { ...attributes };
  }

  get(field) {
    return this.attributes[field];
  }
}

class MockParseObject extends MockObject {
  static createWithoutData(className, objectId) {
    return new MockParseObject(className, objectId);
  }
}

function MockFile(name, data, contentType) {
  this.name = name;
  this.data = data;
  this.contentType = contentType;
  this.save = jest.fn(() => Promise.resolve(this));
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

  descending() {
    return this;
  }

  limit() {
    return this;
  }

  first() {
    if (this.className === 'ConversationMember') {
      return Promise.resolve(mockBotMembership);
    }
    return Promise.resolve(undefined);
  }

  find() {
    if (this.className === 'Message') {
      return Promise.resolve(
        this.constraints.replyTo ? mockThreadMessages : mockMessages,
      );
    }
    return Promise.resolve([]);
  }

  get(objectId) {
    if (this.className === 'Message') {
      return Promise.resolve(mockMessagesById.get(objectId));
    }
    if (typeof this.className === 'function') {
      return Promise.resolve(mockBotUser || { id: objectId, className: '_User' });
    }
    return Promise.resolve(undefined);
  }
}

const mockParse = {
  File: MockFile,
  Object: MockParseObject,
  Query: MockQuery,
  User: class MockUser {},
};

jest.mock('../../providers/ParseProvider', () => ({
  __esModule: true,
  default: mockParse,
}));
jest.mock('../../services/ParseMessagingService', () => ({
  sendMessage: mockSendMessage,
}));
jest.mock('../../services/MessagingMetricsService', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn() },
}));

const MayaChatBotService = require('../../services/MayaChatBotService');

const user = id => ({ id });
const conversation = new MockObject('Conversation', 'conversation-1');

const message = (id, authorId, text, overrides = {}) =>
  new MockObject('Message', id, {
    author: user(authorId),
    contentType: 'text',
    conversation,
    isDeleted: false,
    text,
    ...overrides,
  });

describe('MayaChatBotService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.AI_CHATBOT_ENABLED = 'true';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.MAYA_BOT_USER_ID = 'maya-user';
    delete process.env.MAYA_BOT_MODEL;
    delete process.env.APP_CLIP_INVITER_BOT_USER_ID;
    mockBotUser = new MockObject('_User', 'maya-user', {
      mayaReferenceImages: [
        { url: () => 'https://example.com/maya-reference-1.png' },
        { url: () => 'https://example.com/maya-reference-2.png' },
      ],
      smallImage: { url: () => 'https://example.com/maya-profile.png' },
    });
    mockBotMembership = new MockObject('ConversationMember', 'member-maya');
    mockMessages = [
      message('message-1', 'human-user', 'Hello Maya'),
      message('message-2', 'maya-user', 'Hi there'),
      message('message-3', 'human-user', 'Can you help me test?'),
    ];
    mockMessagesById = new Map();
    mockThreadMessages = [];
    mockSendMessage.mockReset();
    mockSendMessage.mockResolvedValue(message('reply-1', 'maya-user', 'Sure.'));
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ output_text: 'Sure, send me a test.' }),
        ok: true,
      }),
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AI_CHATBOT_ENABLED;
    delete process.env.OPENAI_API_KEY;
    delete process.env.MAYA_BOT_IMAGE_MODEL;
    delete process.env.MAYA_BOT_IMAGE_QUALITY;
    delete process.env.MAYA_BOT_IMAGE_SIZE;
    delete process.env.MAYA_BOT_USER_ID;
    delete process.env.MAYA_BOT_MODEL;
  });

  test('does not respond when disabled or authored by Maya', () => {
    process.env.AI_CHATBOT_ENABLED = 'false';
    expect(
      MayaChatBotService.shouldRespondToMessage({
        object: message('message-4', 'human-user', 'Hello'),
      }),
    ).toBe(false);

    process.env.AI_CHATBOT_ENABLED = 'true';
    expect(
      MayaChatBotService.shouldRespondToMessage({
        object: message('message-5', 'maya-user', 'Loop check'),
      }),
    ).toBe(false);
  });

  test('sends a normal Parse message from Maya for a new human text message', async () => {
    const source = message('source-message', 'human-user', 'Can you reply?');

    await MayaChatBotService.afterSaveMessage({ object: source }, mockSendMessage);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'maya-user' }),
      expect.objectContaining({
        clientMessageId: 'maya-bot:source-message',
        conversationId: 'conversation-1',
        deliveryType: 'conversational',
        metadata: {
          bot: 'maya',
          sourceMessageId: 'source-message',
        },
        text: 'Sure, send me a test.',
      }),
    );
    expect(mockSendMessage.mock.calls[0][1]).not.toHaveProperty('replyToId');
  });

  test('keeps a text response in the source thread and scopes model history', async () => {
    const root = message('thread-root', 'human-user', 'Root topic');
    const priorReply = message('prior-reply', 'maya-user', 'Earlier thread reply', {
      replyTo: root,
    });
    const source = message('source-message', 'human-user', 'Thread question', {
      replyTo: root,
    });
    mockMessagesById.set(root.id, root);
    mockThreadMessages = [source, priorReply];

    await MayaChatBotService.afterSaveMessage({ object: source }, mockSendMessage);

    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody.input).toEqual([
      { content: 'Root topic', role: 'user' },
      { content: 'Earlier thread reply', role: 'assistant' },
      { content: 'Thread question', role: 'user' },
    ]);
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'maya-user' }),
      expect.objectContaining({
        clientMessageId: 'maya-bot:source-message',
        conversationId: 'conversation-1',
        replyToId: 'thread-root',
        text: 'Sure, send me a test.',
      }),
    );
  });

  test('detects explicit image prompts', () => {
    expect(MayaChatBotService.extractImagePrompt('/image a purple rocket')).toBe(
      'a purple rocket',
    );
    expect(
      MayaChatBotService.extractImagePrompt('create an image of a small robot'),
    ).toBe('a small robot');
    expect(
      MayaChatBotService.extractImagePrompt(
        'Can you send me an image of you in a red dress?',
      ),
    ).toBe('you in a red dress?');
    expect(MayaChatBotService.extractImagePrompt('What image size is this?')).toBeUndefined();
    expect(MayaChatBotService.isGenericImageRequest('Send me an image')).toBe(true);
    expect(MayaChatBotService.isGenericImageRequest('send me an image of a cat')).toBe(false);
    expect(MayaChatBotService.shouldUseMayaProfileReference('yourself in a dress')).toBe(true);
    expect(MayaChatBotService.shouldUseMayaProfileReference('a tiny purple robot')).toBe(false);
    expect(MayaChatBotService.getMayaReferenceImageUrls(mockBotUser)).toEqual([
      'https://example.com/maya-profile.png',
      'https://example.com/maya-reference-1.png',
      'https://example.com/maya-reference-2.png',
    ]);
  });

  test('sends a generated image attachment from Maya for an image request', async () => {
    const imageBytes = Buffer.from('fakepng');
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            data: [{ b64_json: imageBytes.toString('base64') }],
          }),
        ok: true,
      }),
    );
    const root = message('thread-root', 'human-user', 'Show me an image');
    const source = message('source-message', 'human-user', '/image a tiny purple robot', {
      replyTo: root,
    });
    mockMessagesById.set(root.id, root);
    mockThreadMessages = [source];

    await MayaChatBotService.afterSaveMessage({ object: source }, mockSendMessage);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({
        body: expect.any(String),
        method: 'POST',
      }),
    );
    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody).toEqual({
      model: 'gpt-image-2',
      n: 1,
      prompt: 'a tiny purple robot',
      quality: 'low',
      size: '1024x1024',
    });
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'maya-user' }),
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            byteCount: imageBytes.length,
            file: expect.any(MockFile),
            fileName: 'maya-source-message.png',
            id: 'maya-image-source-message',
            kind: 'image',
            mimeType: 'image/png',
          }),
        ],
        clientMessageId: 'maya-bot-image:source-message',
        contentType: 'image',
        conversationId: 'conversation-1',
        deliveryType: 'conversational',
        metadata: {
          bot: 'maya',
          imageModel: 'gpt-image-2',
          imagePrompt: 'a tiny purple robot',
          sourceMessageId: 'source-message',
        },
        replyToId: 'thread-root',
        text: 'Generated image for: a tiny purple robot',
      }),
    );
    expect(
      mockSendMessage.mock.calls[0][1].attachments[0].file.save,
    ).toHaveBeenCalledWith({ useMasterKey: true });
  });

  test('uses Maya profile image as the reference for self image requests', async () => {
    const imageBytes = Buffer.from('fakepng');
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            data: [{ b64_json: imageBytes.toString('base64') }],
          }),
        ok: true,
      }),
    );
    const source = message(
      'source-message',
      'human-user',
      'Create an image of yourself in a dress.',
    );

    await MayaChatBotService.afterSaveMessage({ object: source }, mockSendMessage);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/edits',
      expect.objectContaining({
        body: expect.any(String),
        method: 'POST',
      }),
    );
    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody).toEqual({
      images: [
        { image_url: 'https://example.com/maya-profile.png' },
        { image_url: 'https://example.com/maya-reference-1.png' },
        { image_url: 'https://example.com/maya-reference-2.png' },
      ],
      model: 'gpt-image-2',
      n: 1,
      prompt:
        'Use the provided images as the complete visual reference set for Maya. Preserve the same character identity, face, hairstyle, color palette, and illustration style. Create a safe, non-sexual, fully clothed avatar/fashion image. Requested change: the same character in a dress. Keep the result wholesome and suitable for all ages. Do not invent a different person.',
      quality: 'low',
      size: '1024x1024',
    });
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'maya-user' }),
      expect.objectContaining({
        clientMessageId: 'maya-bot-image:source-message',
        contentType: 'image',
        metadata: {
          bot: 'maya',
          imageModel: 'gpt-image-2',
          imagePrompt: 'yourself in a dress.',
          imageReference: 'maya_reference_images',
          referenceImageCount: 3,
          sourceMessageId: 'source-message',
        },
      }),
    );
  });

  test('keeps an image clarification in the source thread', async () => {
    const root = message('thread-root', 'human-user', 'Images');
    const source = message('source-message', 'human-user', 'Send me an image', {
      replyTo: root,
    });
    mockMessagesById.set(root.id, root);
    mockThreadMessages = [source];

    await MayaChatBotService.afterSaveMessage({ object: source }, mockSendMessage);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'maya-user' }),
      expect.objectContaining({
        clientMessageId: 'maya-bot-image-clarification:source-message',
        conversationId: 'conversation-1',
        deliveryType: 'conversational',
        metadata: {
          bot: 'maya',
          imageIntent: 'awaiting_prompt',
          sourceMessageId: 'source-message',
        },
        replyToId: 'thread-root',
        text: 'Sure — what would you like the image to show?',
      }),
    );
  });

  test('treats a reply to Maya image clarification as an image request', async () => {
    const imageBytes = Buffer.from('fakepng');
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            data: [{ b64_json: imageBytes.toString('base64') }],
          }),
        ok: true,
      }),
    );
    const source = message(
      'source-message',
      'human-user',
      'You in a fully clothed leather jacket',
    );
    mockMessages = [
      source,
      message(
        'maya-question',
        'maya-user',
        'Sure — what would you like the image to show?',
      ),
      message('image-request', 'human-user', 'Send me an image'),
    ];

    await MayaChatBotService.afterSaveMessage({ object: source }, mockSendMessage);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/edits',
      expect.objectContaining({
        body: expect.any(String),
        method: 'POST',
      }),
    );
    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody.prompt).toContain(
      'Requested change: the same character in a fully clothed leather jacket',
    );
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'maya-user' }),
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            fileName: 'maya-source-message.png',
            id: 'maya-image-source-message',
            kind: 'image',
            mimeType: 'image/png',
          }),
        ],
        clientMessageId: 'maya-bot-image:source-message',
        contentType: 'image',
        metadata: expect.objectContaining({
          imagePrompt: 'You in a fully clothed leather jacket',
          imageReference: 'maya_reference_images',
          referenceImageCount: 3,
        }),
      }),
    );
  });

  test('keeps an image failure fallback in the source thread', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            error: { code: 'moderation_blocked' },
          }),
        ok: false,
        status: 400,
      }),
    );
    const root = message('thread-root', 'human-user', 'Blocked image test');
    const source = message('source-message', 'human-user', '/image blocked subject', {
      replyTo: root,
    });
    mockMessagesById.set(root.id, root);
    mockThreadMessages = [source];

    await MayaChatBotService.afterSaveMessage({ object: source }, mockSendMessage);

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'maya-user' }),
      expect.objectContaining({
        clientMessageId: 'maya-bot-image-error:source-message',
        conversationId: 'conversation-1',
        deliveryType: 'conversational',
        metadata: {
          bot: 'maya',
          imageError: 'moderation_blocked',
          imagePrompt: 'blocked subject',
          sourceMessageId: 'source-message',
        },
        replyToId: 'thread-root',
        text:
          'That image request was blocked by the image safety system. I can still make a fully clothed outfit or portrait image if you describe a safer look.',
      }),
    );
  });

  test('does nothing when Maya is not an active member of the conversation', async () => {
    mockBotMembership = undefined;

    await MayaChatBotService.afterSaveMessage(
      { object: message('source-message', 'human-user', 'Hello') },
      mockSendMessage,
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
