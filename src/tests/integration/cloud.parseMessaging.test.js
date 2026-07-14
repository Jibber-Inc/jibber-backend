import Parse from '../../providers/ParseProvider';
import {
  cleanupDeletedAttachments,
  deactivateUserMemberships,
} from '../../services/ParseMessagingService';
import ChatService from '../../services/ChatService';
import { makeUser } from '../setup/seedDB';

describe('Parse-native messaging integration', () => {
  let conversation;
  let firstUser;
  let secondUser;
  let secondMembership;
  let thirdUser;
  let message;
  let neighboringMessage;
  let firstMoment;
  let secondMoment;

  beforeAll(async () => {
    [firstUser, secondUser, thirdUser] = await Promise.all([
      makeUser(),
      makeUser(),
      makeUser(),
    ]);
    firstMoment = new Parse.Object('Moment');
    firstMoment.set('author', firstUser);
    secondMoment = new Parse.Object('Moment');
    secondMoment.set('author', secondUser);
    [firstMoment, secondMoment] = await Parse.Object.saveAll(
      [firstMoment, secondMoment],
      { useMasterKey: true },
    );
  });

  test('requires authentication for capability discovery', async () => {
    await expect(
      Parse.Cloud.run('messagingGetCapabilities'),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: 'Authentication is required.',
      }),
    );
  });

  test('publishes stable service capabilities and wire vocabulary', async () => {
    const capabilities = await Parse.Cloud.run(
      'messagingGetCapabilities',
      {},
      { sessionToken: firstUser.getSessionToken() },
    );

    expect(capabilities).toEqual(
      expect.objectContaining({
        available: true,
        schemaVersion: 1,
        vocabulary: expect.objectContaining({
          contentTypes: [
            'text',
            'image',
            'video',
            'media',
            'link',
            'system',
            'moment',
          ],
          conversationTypes: ['direct', 'group', 'moment', 'welcome', 'pass'],
          deliveryTypes: ['respectful', 'conversational', 'time-sensitive'],
          memberRoles: ['owner', 'admin', 'member'],
          receiptStates: ['sent', 'delivered', 'read'],
        }),
      }),
    );
    expect(capabilities.idempotency.recoveryFunction).toBe(
      'messagingGetMessageByClientId',
    );
    expect(capabilities.idempotency.conversation).toEqual({
      clientConversationIdScope: ['creator', 'clientConversationId'],
      cloudFunction: 'messagingCreateConversation',
      contextKeyScope: ['contextKey'],
    });
  });

  test('rejects Moment context squatting and validates direct creation', async () => {
    const contextKey = `moment:${firstMoment.id}`;
    await expect(
      Parse.Cloud.run(
        'messagingCreateConversation',
        {
          clientConversationId: 'hostile-context-preclaim-0001',
          contextKey,
          type: 'moment',
        },
        { sessionToken: thirdUser.getSessionToken() },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: expect.stringContaining('Only the Moment author'),
      }),
    );
    await expect(
      Parse.Cloud.run(
        'messagingCreateConversation',
        {
          clientConversationId: 'mismatched-context-type-0001',
          contextKey,
          type: 'group',
        },
        { sessionToken: firstUser.getSessionToken() },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: expect.stringContaining('requires conversation type moment'),
      }),
    );
    await expect(
      Parse.Cloud.run(
        'messagingCreateConversation',
        {
          clientConversationId: 'substituted-context-author-0001',
          contextKey: `moment:${secondMoment.id}`,
          type: 'moment',
        },
        { sessionToken: firstUser.getSessionToken() },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: expect.stringContaining('Only the Moment author'),
      }),
    );

    const hostileDirect = new Parse.Object('Conversation');
    hostileDirect.set('clientConversationId', 'hostile-direct-context-0001');
    hostileDirect.set('contextKey', contextKey);
    hostileDirect.set('title', 'Hostile direct claim');
    hostileDirect.set('type', 'moment');
    await expect(
      hostileDirect.save(null, {
        sessionToken: thirdUser.getSessionToken(),
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: expect.stringContaining('Only the Moment author'),
      }),
    );

    let directMoment = new Parse.Object('Moment');
    directMoment.set('author', thirdUser);
    directMoment = await directMoment.save(null, { useMasterKey: true });
    let directConversation = new Parse.Object('Conversation');
    directConversation.set(
      'clientConversationId',
      'authorized-direct-context-0001',
    );
    directConversation.set('contextKey', `moment:${directMoment.id}`);
    directConversation.set('title', 'Authorized direct claim');
    directConversation.set('type', 'moment');
    directConversation = await directConversation.save(null, {
      sessionToken: thirdUser.getSessionToken(),
    });
    let ownerMembership = new Parse.Object('ConversationMember');
    ownerMembership.set('active', true);
    ownerMembership.set('conversation', directConversation);
    ownerMembership.set('notificationsEnabled', true);
    ownerMembership.set('role', 'owner');
    ownerMembership.set('user', thirdUser);
    ownerMembership = await ownerMembership.save(null, {
      sessionToken: thirdUser.getSessionToken(),
    });
    expect(directConversation.get('creator').id).toBe(thirdUser.id);
    expect(ownerMembership.get('role')).toBe('owner');
  });

  test('creates an ACL-protected conversation with canonical Parse users', async () => {
    const params = {
      clientConversationId: 'integration-conversation-0001',
      contextKey: `moment:${firstMoment.id}`,
      memberIds: [secondUser.id],
      title: 'Parse migration',
      type: 'moment',
    };
    const options = { sessionToken: firstUser.getSessionToken() };
    conversation = await Parse.Cloud.run(
      'messagingCreateConversation',
      params,
      options,
    );
    const exactRetry = await Parse.Cloud.run(
      'messagingCreateConversation',
      params,
      options,
    );
    const clientKeyRetry = await Parse.Cloud.run(
      'messagingCreateConversation',
      { clientConversationId: params.clientConversationId },
      options,
    );
    const contextKeyRetry = await Parse.Cloud.run(
      'messagingCreateConversation',
      {
        clientConversationId: 'integration-conversation-0002',
        contextKey: params.contextKey,
        type: 'moment',
      },
      options,
    );

    expect(conversation.get('creator').id).toBe(firstUser.id);
    expect(conversation.get('clientConversationId')).toBe(
      params.clientConversationId,
    );
    expect(conversation.get('contextKey')).toBe(params.contextKey);
    expect(conversation.get('type')).toBe('moment');
    expect(exactRetry.id).toBe(conversation.id);
    expect(clientKeyRetry.id).toBe(conversation.id);
    expect(contextKeyRetry.id).toBe(conversation.id);

    const storedConversations = await new Parse.Query('Conversation')
      .equalTo('creator', firstUser)
      .equalTo('clientConversationId', params.clientConversationId)
      .find(options);
    expect(storedConversations).toHaveLength(1);

    const memberships = await new Parse.Query('ConversationMember')
      .equalTo('conversation', conversation)
      .find({ sessionToken: firstUser.getSessionToken() });
    expect(memberships).toHaveLength(2);
    expect(memberships.map(member => member.get('user').id).sort()).toEqual(
      [firstUser.id, secondUser.id].sort(),
    );
    secondMembership = memberships.find(
      member => member.get('user').id === secondUser.id,
    );

    await expect(
      new Parse.Query('Conversation').get(conversation.id, {
        sessionToken: thirdUser.getSessionToken(),
      }),
    ).rejects.toEqual(expect.objectContaining({ code: 101 }));
  });

  test('repairs incomplete membership provisioning without reviving leavers', async () => {
    let incomplete = new Parse.Object('Conversation');
    incomplete.set('clientConversationId', 'partial-provisioning-0001');
    incomplete.set('creator', firstUser);
    incomplete.set('title', 'Partial provisioning');
    incomplete.set('type', 'group');
    incomplete = await incomplete.save(null, { useMasterKey: true });
    expect(incomplete.get('membershipRevision')).toBe(0);

    const params = {
      clientConversationId: 'partial-provisioning-0001',
      memberIds: [secondUser.id],
      title: 'Partial provisioning',
      type: 'group',
    };
    const options = { sessionToken: firstUser.getSessionToken() };
    const repaired = await Promise.all([
      Parse.Cloud.run('messagingCreateConversation', params, options),
      Parse.Cloud.run('messagingCreateConversation', params, options),
    ]);
    expect(repaired[0].id).toBe(incomplete.id);
    expect(repaired[1].id).toBe(incomplete.id);

    let repairedMemberships = await new Parse.Query('ConversationMember')
      .equalTo('conversation', incomplete)
      .find({ useMasterKey: true });
    expect(repairedMemberships).toHaveLength(2);
    expect(repairedMemberships.every(member => member.get('active'))).toBe(true);
    incomplete = await incomplete.fetch({ useMasterKey: true });
    expect(incomplete.get('membershipRevision')).toBeGreaterThan(0);

    let departingMember = repairedMemberships.find(
      membership => membership.get('user').id === secondUser.id,
    );
    departingMember.set('active', false);
    departingMember = await departingMember.save(null, {
      sessionToken: secondUser.getSessionToken(),
    });
    expect(departingMember.get('active')).toBe(false);

    await Parse.Cloud.run('messagingCreateConversation', params, options);
    repairedMemberships = await new Parse.Query('ConversationMember')
      .equalTo('conversation', incomplete)
      .find({ useMasterKey: true });
    const stillDeparted = repairedMemberships.find(
      membership => membership.get('user').id === secondUser.id,
    );
    expect(stillDeparted.get('active')).toBe(false);
  });

  test('allows only connected Moment viewers to self-join as members', async () => {
    let viewerMoment = new Parse.Object('Moment');
    viewerMoment.set('author', firstUser);
    viewerMoment = await viewerMoment.save(null, { useMasterKey: true });
    const viewerConversation = await Parse.Cloud.run(
      'messagingCreateConversation',
      {
        clientConversationId: 'moment-viewer-conversation-0001',
        contextKey: `moment:${viewerMoment.id}`,
        type: 'moment',
      },
      { sessionToken: firstUser.getSessionToken() },
    );

    const acceptedConnection = new Parse.Object('Connection');
    acceptedConnection.set('from', firstUser);
    acceptedConnection.set('status', 'accepted');
    acceptedConnection.set('to', secondUser);
    await acceptedConnection.save(null, { useMasterKey: true });

    const privilegedJoin = new Parse.Object('ConversationMember');
    privilegedJoin.set('active', true);
    privilegedJoin.set('conversation', viewerConversation);
    privilegedJoin.set('notificationsEnabled', true);
    privilegedJoin.set('role', 'admin');
    privilegedJoin.set('user', secondUser);
    await expect(
      privilegedJoin.save(null, {
        sessionToken: secondUser.getSessionToken(),
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: expect.stringContaining('must have role member'),
      }),
    );

    const strangerJoin = new Parse.Object('ConversationMember');
    strangerJoin.set('active', true);
    strangerJoin.set('conversation', viewerConversation);
    strangerJoin.set('notificationsEnabled', true);
    strangerJoin.set('role', 'member');
    strangerJoin.set('user', thirdUser);
    await expect(
      strangerJoin.save(null, {
        sessionToken: thirdUser.getSessionToken(),
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: expect.stringContaining('accepted connection'),
      }),
    );

    let viewerJoin = new Parse.Object('ConversationMember');
    viewerJoin.set('active', true);
    viewerJoin.set('conversation', viewerConversation);
    viewerJoin.set('notificationsEnabled', true);
    viewerJoin.set('role', 'member');
    viewerJoin.set('user', secondUser);
    viewerJoin = await viewerJoin.save(null, {
      sessionToken: secondUser.getSessionToken(),
    });
    expect(viewerJoin.get('active')).toBe(true);
    expect(viewerJoin.get('role')).toBe('member');
    await expect(
      new Parse.Query('Conversation').get(viewerConversation.id, {
        sessionToken: secondUser.getSessionToken(),
      }),
    ).resolves.toBeDefined();
  });

  test('hides a conversation per member until a new message arrives', async () => {
    secondMembership = await Parse.Cloud.run(
      'messagingSetConversationHidden',
      { conversationId: conversation.id, isHidden: true },
      { sessionToken: secondUser.getSessionToken() },
    );
    expect(secondMembership.get('isHidden')).toBe(true);
    expect(secondMembership.get('hiddenAt')).toBeInstanceOf(Date);

    const visibleMembership = await new Parse.Query('ConversationMember')
      .equalTo('conversation', conversation)
      .equalTo('user', secondUser)
      .equalTo('active', true)
      .equalTo('isHidden', false)
      .first({ sessionToken: secondUser.getSessionToken() });
    expect(visibleMembership).toBeUndefined();
  });

  test('suppresses duplicate sends and exposes deterministic recovery', async () => {
    const params = {
      clientMessageId: 'integration-message-0001',
      contentType: 'text',
      conversationId: conversation.id,
      deliveryType: 'conversational',
      text: 'Hello from Parse',
    };
    const options = { sessionToken: firstUser.getSessionToken() };

    message = await Parse.Cloud.run('messagingSendMessage', params, options);
    const retried = await Parse.Cloud.run('messagingSendMessage', params, options);
    const recovered = await Parse.Cloud.run(
      'messagingGetMessageByClientId',
      {
        clientMessageId: params.clientMessageId,
        conversationId: conversation.id,
      },
      options,
    );

    expect(retried.id).toBe(message.id);
    expect(recovered.id).toBe(message.id);
    expect(message.get('author').id).toBe(firstUser.id);

    const storedMessages = await new Parse.Query('Message')
      .equalTo('conversation', conversation)
      .equalTo('clientMessageId', params.clientMessageId)
      .find(options);
    expect(storedMessages).toHaveLength(1);

    secondMembership = await secondMembership.fetch({
      sessionToken: secondUser.getSessionToken(),
    });
    expect(secondMembership.get('isHidden')).toBe(false);
    expect(secondMembership.get('hiddenAt')).toBeUndefined();
  });

  test('rejects a client message id collision owned by another member', async () => {
    const params = {
      clientMessageId: 'integration-message-0001',
      contentType: 'text',
      conversationId: conversation.id,
      deliveryType: 'respectful',
      text: 'A different member must not recover this message',
    };
    const options = { sessionToken: secondUser.getSessionToken() };

    await expect(
      Parse.Cloud.run('messagingSendMessage', params, options),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: expect.stringContaining('clientMessageId collision'),
      }),
    );
    await expect(
      Parse.Cloud.run(
        'messagingGetMessageByClientId',
        {
          clientMessageId: params.clientMessageId,
          conversationId: params.conversationId,
        },
        options,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: expect.stringContaining('clientMessageId collision'),
      }),
    );
  });

  test('derives delivery receipts, unread counts, and read cursors', async () => {
    neighboringMessage = await Parse.Cloud.run(
      'messagingSendMessage',
      {
        clientMessageId: 'integration-message-0002',
        contentType: 'text',
        conversationId: conversation.id,
        deliveryType: 'respectful',
        text: 'Neighboring message',
      },
      { sessionToken: firstUser.getSessionToken() },
    );
    const receipts = await new Parse.Query('MessageReceipt')
      .equalTo('message', message)
      .find({ sessionToken: secondUser.getSessionToken() });
    expect(receipts).toHaveLength(2);
    expect(
      receipts.find(receipt => receipt.get('user').id === firstUser.id).get('state'),
    ).toBe('read');
    expect(
      receipts.find(receipt => receipt.get('user').id === secondUser.id).get('state'),
    ).toBe('delivered');

    secondMembership = await new Parse.Query('ConversationMember')
      .equalTo('conversation', conversation)
      .equalTo('user', secondUser)
      .first({ sessionToken: secondUser.getSessionToken() });
    expect(secondMembership.get('unreadCount')).toBe(2);

    let secondReceipt = receipts.find(
      receipt => receipt.get('user').id === secondUser.id,
    );
    secondReceipt.set('state', 'read');
    secondReceipt = await secondReceipt.save(null, {
      sessionToken: secondUser.getSessionToken(),
    });
    expect(secondReceipt.get('readAt')).toBeInstanceOf(Date);

    const neighboringReceipt = await new Parse.Query('MessageReceipt')
      .equalTo('message', neighboringMessage)
      .equalTo('user', secondUser)
      .first({ sessionToken: secondUser.getSessionToken() });
    expect(neighboringReceipt.get('state')).toBe('delivered');
    expect(neighboringReceipt.get('readAt')).toBeUndefined();

    secondMembership = await secondMembership.fetch({
      sessionToken: secondUser.getSessionToken(),
    });
    expect(secondMembership.get('unreadCount')).toBe(1);

    secondReceipt.set('state', 'delivered');
    secondReceipt = await secondReceipt.save(null, {
      sessionToken: secondUser.getSessionToken(),
    });
    expect(secondReceipt.get('readAt')).toBeUndefined();

    const unchangedNeighbor = await neighboringReceipt.fetch({
      sessionToken: secondUser.getSessionToken(),
    });
    expect(unchangedNeighbor.get('state')).toBe('delivered');
    expect(unchangedNeighbor.get('readAt')).toBeUndefined();

    await Parse.Cloud.run(
      'messagingMarkRead',
      { messageId: neighboringMessage.id },
      { sessionToken: secondUser.getSessionToken() },
    );
    secondMembership = await secondMembership.fetch({
      sessionToken: secondUser.getSessionToken(),
    });
    expect(secondMembership.get('unreadCount')).toBe(0);
    expect(secondMembership.get('lastReadMessage').id).toBe(
      neighboringMessage.id,
    );
    expect(secondMembership.get('lastReadAt')).toBeInstanceOf(Date);
  });

  test('derives idempotent reply counts and latest-reply summaries', async () => {
    const options = { sessionToken: firstUser.getSessionToken() };
    const firstReplyParams = {
      clientMessageId: 'integration-reply-0001',
      contentType: 'text',
      conversationId: conversation.id,
      deliveryType: 'conversational',
      replyToId: message.id,
      text: 'First reply',
    };
    const firstReply = await Parse.Cloud.run(
      'messagingSendMessage',
      firstReplyParams,
      options,
    );
    const retriedReply = await Parse.Cloud.run(
      'messagingSendMessage',
      firstReplyParams,
      options,
    );
    expect(retriedReply.id).toBe(firstReply.id);

    await expect(
      Parse.Cloud.run(
        'messagingSendMessage',
        {
          clientMessageId: 'integration-nested-reply-0001',
          contentType: 'text',
          conversationId: conversation.id,
          deliveryType: 'conversational',
          replyToId: firstReply.id,
          text: 'Nested reply through Cloud Code',
        },
        options,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: 'replyTo must reference a root message.',
      }),
    );

    const directNestedReply = new Parse.Object('Message');
    directNestedReply.set('clientMessageId', 'integration-nested-reply-0002');
    directNestedReply.set('contentType', 'text');
    directNestedReply.set('conversation', conversation);
    directNestedReply.set('deliveryType', 'conversational');
    directNestedReply.set('replyTo', firstReply);
    directNestedReply.set('text', 'Nested reply through a direct write');
    await expect(directNestedReply.save(null, options)).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: 'replyTo must reference a root message.',
      }),
    );

    message = await new Parse.Query('Message').get(message.id, options);
    expect(message.get('replyCount')).toBe(1);
    expect(message.get('latestReply').id).toBe(firstReply.id);
    expect(message.get('latestReplyText')).toBe('First reply');

    let secondReply = await Parse.Cloud.run(
      'messagingSendMessage',
      {
        clientMessageId: 'integration-reply-0002',
        contentType: 'text',
        conversationId: conversation.id,
        deliveryType: 'respectful',
        replyToId: message.id,
        text: 'Second reply',
      },
      options,
    );
    message = await new Parse.Query('Message').get(message.id, options);
    expect(message.get('replyCount')).toBe(2);
    expect(message.get('latestReply').id).toBe(secondReply.id);
    expect(message.get('latestReplyAt')).toBeInstanceOf(Date);
    expect(message.get('latestReplyAuthor').id).toBe(firstUser.id);
    expect(message.get('latestReplyText')).toBe('Second reply');

    secondReply.set('text', 'Second reply edited');
    secondReply = await secondReply.save(null, options);
    expect(secondReply.get('editedAt')).toBeInstanceOf(Date);
    message = await new Parse.Query('Message').get(message.id, options);
    expect(message.get('latestReply').id).toBe(secondReply.id);
    expect(message.get('latestReplyText')).toBe('Second reply edited');

    const firstPage = await new Parse.Query('Message')
      .equalTo('replyTo', message)
      .descending('createdAt')
      .addDescending('objectId')
      .limit(1)
      .find(options);
    expect(firstPage).toHaveLength(1);
    expect(firstPage[0].id).toBe(secondReply.id);

    const pageCursor = firstPage[0];
    const earlierReplies = new Parse.Query('Message').lessThan(
      'createdAt',
      pageCursor.createdAt,
    );
    const tiedReplies = new Parse.Query('Message')
      .equalTo('createdAt', pageCursor.createdAt)
      .lessThan('objectId', pageCursor.id);
    const secondPage = await Parse.Query.or(earlierReplies, tiedReplies)
      .equalTo('replyTo', message)
      .descending('createdAt')
      .addDescending('objectId')
      .limit(1)
      .find(options);
    expect(secondPage).toHaveLength(1);
    expect(secondPage[0].id).toBe(firstReply.id);
    expect(new Set([...firstPage, ...secondPage].map(reply => reply.id))).toEqual(
      new Set([firstReply.id, secondReply.id]),
    );

    message.set('replyCount', 999);
    await expect(message.save(null, options)).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: expect.stringContaining('protected fields: replyCount'),
      }),
    );
    message = await new Parse.Query('Message').get(message.id, options);

    secondReply.set('isDeleted', true);
    secondReply = await secondReply.save(null, options);
    expect(secondReply.get('deletedAt')).toBeInstanceOf(Date);
    message = await new Parse.Query('Message').get(message.id, options);
    expect(message.get('replyCount')).toBe(1);
    expect(message.get('latestReply').id).toBe(firstReply.id);

    firstReply.set('isDeleted', true);
    await firstReply.save(null, options);
    message = await new Parse.Query('Message').get(message.id, options);
    expect(message.get('replyCount')).toBe(0);
    expect(message.get('latestReply')).toBeUndefined();
    expect(message.get('latestReplyAt')).toBeUndefined();
    expect(message.get('latestReplyAuthor')).toBeUndefined();
    expect(message.get('latestReplyText')).toBeUndefined();
  });

  test('rejects deleted and cross-conversation reply targets', async () => {
    const options = { sessionToken: firstUser.getSessionToken() };
    let deletedRoot = await Parse.Cloud.run(
      'messagingSendMessage',
      {
        clientMessageId: 'integration-deleted-reply-root-0001',
        contentType: 'text',
        conversationId: conversation.id,
        deliveryType: 'respectful',
        text: 'Deleted reply root',
      },
      options,
    );
    deletedRoot.set('isDeleted', true);
    deletedRoot = await deletedRoot.save(null, options);
    expect(deletedRoot.get('isDeleted')).toBe(true);

    await expect(
      Parse.Cloud.run(
        'messagingSendMessage',
        {
          clientMessageId: 'integration-deleted-reply-target-0001',
          contentType: 'text',
          conversationId: conversation.id,
          deliveryType: 'respectful',
          replyToId: deletedRoot.id,
          text: 'Reply to a deleted root',
        },
        options,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: 'replyTo must reference an active message in this conversation.',
      }),
    );

    const foreignConversation = await Parse.Cloud.run(
      'messagingCreateConversation',
      {
        clientConversationId: 'integration-foreign-thread-conversation-0001',
        memberIds: [secondUser.id],
        title: 'Foreign thread target',
        type: 'group',
      },
      options,
    );
    const foreignRoot = await Parse.Cloud.run(
      'messagingSendMessage',
      {
        clientMessageId: 'integration-foreign-reply-root-0001',
        contentType: 'text',
        conversationId: foreignConversation.id,
        deliveryType: 'respectful',
        text: 'Root from another conversation',
      },
      options,
    );

    await expect(
      Parse.Cloud.run(
        'messagingSendMessage',
        {
          clientMessageId: 'integration-cross-conversation-reply-0001',
          contentType: 'text',
          conversationId: conversation.id,
          deliveryType: 'respectful',
          replyToId: foreignRoot.id,
          text: 'Cross-conversation reply',
        },
        options,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: 'replyTo must reference an active message in this conversation.',
      }),
    );
  });

  test('rejects forged identity fields and hard deletion', async () => {
    conversation.set(
      'clientConversationId',
      'integration-conversation-forged-0001',
    );
    await expect(
      conversation.save(null, { sessionToken: firstUser.getSessionToken() }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: expect.stringContaining('server-managed'),
      }),
    );
    conversation = await new Parse.Query('Conversation').get(conversation.id, {
      sessionToken: firstUser.getSessionToken(),
    });

    const forged = new Parse.Object('Message');
    forged.set('author', secondUser);
    forged.set('clientMessageId', 'integration-forged-0001');
    forged.set('contentType', 'text');
    forged.set('conversation', conversation);
    forged.set('deliveryType', 'respectful');
    forged.set('text', 'Forged author');

    await expect(
      forged.save(null, { sessionToken: firstUser.getSessionToken() }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: expect.stringContaining('protected fields: author'),
      }),
    );

    await expect(
      message.destroy({ sessionToken: firstUser.getSessionToken() }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 119,
        message: expect.stringContaining('Permission denied'),
      }),
    );
  });

  test('enforces reaction membership, ownership, idempotency, and tombstones', async () => {
    const options = { sessionToken: secondUser.getSessionToken() };
    await expect(
      Parse.Cloud.run(
        'messagingAddReaction',
        { messageId: message.id, type: 'read' },
        options,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: 'type has an unsupported value.',
      }),
    );

    const unsupportedDirectReaction = new Parse.Object('MessageReaction');
    unsupportedDirectReaction.set('message', message);
    unsupportedDirectReaction.set('type', 'celebrate');
    await expect(
      unsupportedDirectReaction.save(null, options),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: 'type has an unsupported value.',
      }),
    );

    const supportedDirectReaction = new Parse.Object('MessageReaction');
    supportedDirectReaction.set('message', neighboringMessage);
    supportedDirectReaction.set('type', 'dislike');
    const savedDirectReaction = await supportedDirectReaction.save(null, options);
    expect(savedDirectReaction.get('conversation').id).toBe(conversation.id);
    expect(savedDirectReaction.get('isDeleted')).toBe(false);
    expect(savedDirectReaction.get('type')).toBe('dislike');
    expect(savedDirectReaction.get('user').id).toBe(secondUser.id);

    const reaction = await Parse.Cloud.run(
      'messagingAddReaction',
      { messageId: message.id, type: 'love' },
      options,
    );
    const retriedReaction = await Parse.Cloud.run(
      'messagingAddReaction',
      { messageId: message.id, type: 'love' },
      options,
    );
    expect(retriedReaction.id).toBe(reaction.id);
    const switchedReaction = await Parse.Cloud.run(
      'messagingAddReaction',
      { messageId: message.id, type: 'like' },
      options,
    );
    expect(switchedReaction.id).toBe(reaction.id);
    expect(switchedReaction.get('type')).toBe('like');
    const secondUserSelections = await new Parse.Query('MessageReaction')
      .equalTo('message', message)
      .equalTo('user', secondUser)
      .find({ useMasterKey: true });
    expect(secondUserSelections).toHaveLength(1);
    expect(secondUserSelections[0].get('isDeleted')).toBe(false);
    expect(secondUserSelections[0].get('type')).toBe('like');

    const firstUserOptions = { sessionToken: firstUser.getSessionToken() };
    const concurrentSelections = await Promise.all([
      Parse.Cloud.run(
        'messagingAddReaction',
        { messageId: message.id, type: 'like' },
        firstUserOptions,
      ),
      Parse.Cloud.run(
        'messagingAddReaction',
        { messageId: message.id, type: 'love' },
        firstUserOptions,
      ),
    ]);
    expect(concurrentSelections[1].id).toBe(concurrentSelections[0].id);
    expect(concurrentSelections.map(selection => selection.get('type')).sort()).toEqual(
      ['like', 'love'],
    );
    const firstUserSelections = await new Parse.Query('MessageReaction')
      .equalTo('message', message)
      .equalTo('user', firstUser)
      .find({ useMasterKey: true });
    expect(firstUserSelections).toHaveLength(1);
    expect(firstUserSelections[0].get('isDeleted')).toBe(false);
    expect(['like', 'love']).toContain(firstUserSelections[0].get('type'));

    await expect(
      Parse.Cloud.run(
        'messagingAddReaction',
        { messageId: message.id, type: 'dislike' },
        { sessionToken: thirdUser.getSessionToken() },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: 'The user is not an active conversation member.',
      }),
    );

    const reactionAsFirstUser = await new Parse.Query('MessageReaction').get(
      reaction.id,
      { sessionToken: firstUser.getSessionToken() },
    );
    reactionAsFirstUser.set('isDeleted', true);
    await expect(
      reactionAsFirstUser.save(null, {
        sessionToken: firstUser.getSessionToken(),
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: 'Only the reaction owner may update it.',
      }),
    );

    const currentReaction = await new Parse.Query('MessageReaction').get(
      reaction.id,
      options,
    );
    currentReaction.set('isDeleted', true);
    const deletedReaction = await currentReaction.save(null, options);
    expect(deletedReaction.get('deletedAt')).toBeInstanceOf(Date);
    const restoredReaction = await Parse.Cloud.run(
      'messagingAddReaction',
      { messageId: message.id, type: 'love' },
      options,
    );
    expect(restoredReaction.id).toBe(reaction.id);
    expect(restoredReaction.get('type')).toBe('love');
    expect(restoredReaction.get('isDeleted')).toBe(false);
    expect(restoredReaction.get('deletedAt')).toBeUndefined();

    message.set('isDeleted', true);
    message = await message.save(null, {
      sessionToken: firstUser.getSessionToken(),
    });
    expect(message.get('isDeleted')).toBe(true);
    expect(message.get('deletedAt')).toBeInstanceOf(Date);
    expect(message.get('text')).toBe('');

    await expect(
      Parse.Cloud.run(
        'messagingAddReaction',
        { messageId: message.id, type: 'like' },
        options,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: 'Cannot react to a deleted message.',
      }),
    );

    const deletedTargetReaction = new Parse.Object('MessageReaction');
    deletedTargetReaction.set('message', message);
    deletedTargetReaction.set('type', 'dislike');
    await expect(
      deletedTargetReaction.save(null, options),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: 'Cannot react to a deleted message.',
      }),
    );

    message.set('metadata', { editedAfterDelete: true });
    await expect(
      message.save(null, { sessionToken: firstUser.getSessionToken() }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: expect.stringContaining('Deleted messages cannot be modified'),
      }),
    );
  });

  test('detaches tombstone attachments without deleting a shared Parse.File', async () => {
    const payload = Buffer.from('shared-attachment-payload');
    const sharedFile = new Parse.File('shared.txt', payload);
    await sharedFile.save({ useMasterKey: true });
    const options = { sessionToken: firstUser.getSessionToken() };
    let deletedAttachmentMessage = await Parse.Cloud.run(
      'messagingSendMessage',
      {
        attachments: [
          { byteCount: payload.length, file: sharedFile, kind: 'file' },
        ],
        clientMessageId: 'shared-file-message-deleted-0001',
        contentType: 'media',
        conversationId: conversation.id,
        deliveryType: 'respectful',
        text: 'This reference will be detached',
      },
      options,
    );
    const retainedAttachmentMessage = await Parse.Cloud.run(
      'messagingSendMessage',
      {
        attachments: [
          { byteCount: payload.length, file: sharedFile, kind: 'file' },
        ],
        clientMessageId: 'shared-file-message-retained-0001',
        contentType: 'media',
        conversationId: conversation.id,
        deliveryType: 'respectful',
        text: 'This reference remains live',
      },
      options,
    );

    deletedAttachmentMessage.set('isDeleted', true);
    deletedAttachmentMessage = await deletedAttachmentMessage.save(null, options);
    deletedAttachmentMessage.set(
      'deletedAt',
      new Date(Date.now() - 2 * 60 * 60 * 1000),
    );
    await deletedAttachmentMessage.save(null, { useMasterKey: true });

    const previousGraceHours = process.env.MESSAGING_ATTACHMENT_CLEANUP_HOURS;
    process.env.MESSAGING_ATTACHMENT_CLEANUP_HOURS = '1';
    const cleanedCount = await cleanupDeletedAttachments();
    if (previousGraceHours === undefined) {
      delete process.env.MESSAGING_ATTACHMENT_CLEANUP_HOURS;
    } else {
      process.env.MESSAGING_ATTACHMENT_CLEANUP_HOURS = previousGraceHours;
    }

    deletedAttachmentMessage = await deletedAttachmentMessage.fetch({
      useMasterKey: true,
    });
    const retained = await retainedAttachmentMessage.fetch({
      useMasterKey: true,
    });
    const retainedFile = retained.get('attachments')[0].file;
    const downloadedBase64 = await retainedFile.getData();
    expect(cleanedCount).toBeGreaterThanOrEqual(1);
    expect(deletedAttachmentMessage.get('attachments')).toEqual([]);
    expect(deletedAttachmentMessage.get('attachmentsPurgedAt')).toBeInstanceOf(
      Date,
    );
    expect(retained.get('attachments')).toHaveLength(1);
    expect(Buffer.from(downloadedBase64, 'base64')).toEqual(payload);
  });

  test('routes compatibility Cloud functions through Parse messaging', async () => {
    const firstUserOptions = { sessionToken: firstUser.getSessionToken() };
    const conversationId = 'legacy-integration-conversation-0001';
    const hostilePreclaim = await Parse.Cloud.run(
      'createConversation',
      {
        conversationId,
        members: [secondUser.id],
        title: 'Hostile preclaim attempt',
        type: 'messaging',
      },
      { sessionToken: thirdUser.getSessionToken() },
    );
    const created = await Parse.Cloud.run(
      'createConversation',
      {
        conversationId,
        members: [secondUser.id],
        title: 'Compatibility adapter',
        type: 'messaging',
      },
      firstUserOptions,
    );
    const retried = await Parse.Cloud.run(
      'createConversation',
      {
        conversationId,
        members: [secondUser.id],
        title: 'Compatibility adapter',
        type: 'messaging',
      },
      firstUserOptions,
    );
    const legacyConversation = created.conversation;

    expect(legacyConversation.className).toBe('Conversation');
    expect(legacyConversation.get('type')).toBe('direct');
    expect(retried.conversation.id).toBe(legacyConversation.id);
    expect(hostilePreclaim.conversation.id).not.toBe(legacyConversation.id);
    expect(hostilePreclaim.conversation.get('contextKey')).toBeUndefined();
    expect(legacyConversation.get('contextKey')).toBeUndefined();

    await ChatService.addMemberToConversation(legacyConversation, [thirdUser.id]);
    const addedMembership = await new Parse.Query('ConversationMember')
      .equalTo('conversation', legacyConversation)
      .equalTo('user', thirdUser)
      .equalTo('active', true)
      .first({ sessionToken: thirdUser.getSessionToken() });
    expect(addedMembership).toBeDefined();

    const legacyMessage = await Parse.Cloud.run(
      'sendMessage',
      {
        conversationId: legacyConversation.id,
        message: {
          clientMessageId: 'legacy-integration-message-0001',
          context: 'active',
          text: 'Sent through the Parse compatibility adapter',
        },
        ownerId: firstUser.id,
      },
      firstUserOptions,
    );
    expect(legacyMessage.className).toBe('Message');
    expect(legacyMessage.get('author').id).toBe(firstUser.id);
    expect(legacyMessage.get('deliveryType')).toBe('conversational');

    const reaction = await Parse.Cloud.run(
      'addReaction',
      {
        conversationCid: legacyConversation.id,
        messageId: legacyMessage.id,
      },
      { sessionToken: secondUser.getSessionToken() },
    );
    expect(reaction.className).toBe('MessageReaction');
    expect(reaction.get('type')).toBe('like');
    expect(reaction.get('user').id).toBe(secondUser.id);
  });

  test('promotes a manager on direct leave and revokes creator reuse', async () => {
    const leavingOwner = await makeUser();
    const remainingMember = await makeUser();
    const params = {
      clientConversationId: 'direct-leave-lifecycle-0001',
      memberIds: [remainingMember.id],
      title: 'Direct leave lifecycle',
      type: 'direct',
    };
    const ownerOptions = { sessionToken: leavingOwner.getSessionToken() };
    const directConversation = await Parse.Cloud.run(
      'messagingCreateConversation',
      params,
      ownerOptions,
    );
    let ownerMembership = await new Parse.Query('ConversationMember')
      .equalTo('conversation', directConversation)
      .equalTo('user', leavingOwner)
      .first(ownerOptions);
    ownerMembership.set('active', false);
    ownerMembership = await ownerMembership.save(null, ownerOptions);
    expect(ownerMembership.get('active')).toBe(false);

    const promotedMembership = await new Parse.Query('ConversationMember')
      .equalTo('conversation', directConversation)
      .equalTo('user', remainingMember)
      .first({ sessionToken: remainingMember.getSessionToken() });
    expect(promotedMembership.get('active')).toBe(true);
    expect(promotedMembership.get('role')).toBe('owner');

    await expect(
      Parse.Cloud.run('messagingCreateConversation', params, ownerOptions),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 141,
        message: expect.stringContaining('idempotency key is already in use'),
      }),
    );
    const storedConversation = await new Parse.Query('Conversation').get(
      directConversation.id,
      { useMasterKey: true },
    );
    expect(storedConversation.get('creator').id).toBe(leavingOwner.id);
  });

  test('promotes a deterministic manager when the sole owner leaves', async () => {
    const lifecycleOwner = await makeUser();
    const lifecycleMembers = await Promise.all([makeUser(), makeUser()]);
    const lifecycleConversations = await Promise.all(
      [1, 2, 3].map(index =>
        Parse.Cloud.run(
          'messagingCreateConversation',
          {
            clientConversationId: `lifecycle-conversation-000${index}`,
            memberIds: lifecycleMembers.map(member => member.id),
            title: `Owner lifecycle ${index}`,
            type: 'group',
          },
          { sessionToken: lifecycleOwner.getSessionToken() },
        ),
      ),
    );
    const lifecycleConversation = lifecycleConversations[0];
    const before = await new Parse.Query('ConversationMember')
      .equalTo('conversation', lifecycleConversation)
      .equalTo('active', true)
      .ascending('joinedAt')
      .addAscending('objectId')
      .find({ useMasterKey: true });
    const expectedPromotion = before.find(
      membership => membership.get('user').id !== lifecycleOwner.id,
    );

    const deactivatedCount = await deactivateUserMemberships(
      lifecycleOwner.id,
      { pageSize: 2 },
    );

    const after = await new Parse.Query('ConversationMember')
      .equalTo('conversation', lifecycleConversation)
      .find({ useMasterKey: true });
    const ownerMembership = after.find(
      membership => membership.get('user').id === lifecycleOwner.id,
    );
    const managers = after.filter(
      membership =>
        membership.get('active') &&
        ['owner', 'admin'].includes(membership.get('role')),
    );
    const storedConversation = await new Parse.Query('Conversation').get(
      lifecycleConversation.id,
      { useMasterKey: true },
    );

    expect(ownerMembership.get('active')).toBe(false);
    expect(ownerMembership.get('leftAt')).toBeInstanceOf(Date);
    expect(managers).toHaveLength(1);
    expect(managers[0].id).toBe(expectedPromotion.id);
    expect(storedConversation.get('creator').id).toBe(lifecycleOwner.id);
    expect(deactivatedCount).toBe(3);
    const activeOwnerMemberships = await new Parse.Query('ConversationMember')
      .equalTo('user', lifecycleOwner)
      .equalTo('active', true)
      .count({ useMasterKey: true });
    expect(activeOwnerMemberships).toBe(0);
  });
});
