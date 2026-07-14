import conversation from '../../schemas/Conversation.json';
import member from '../../schemas/ConversationMember.json';
import message from '../../schemas/Message.json';
import reaction from '../../schemas/MessageReaction.json';
import receipt from '../../schemas/MessageReceipt.json';
import indexDefinitions from '../../schemas/indexes/Messaging.json';

const schemas = [conversation, member, message, reaction, receipt];

describe('Parse messaging schemas', () => {
  test('requires authentication and denies hard deletes and schema mutation', () => {
    schemas.forEach(schema => {
      const permissions = schema.classLevelPermissions;
      expect(permissions.find).toEqual({ requiresAuthentication: true });
      expect(permissions.get).toEqual({ requiresAuthentication: true });
      expect(permissions.create).toEqual({ requiresAuthentication: true });
      expect(permissions.update).toEqual({ requiresAuthentication: true });
      expect(permissions.delete).toEqual({});
      expect(permissions.addField).toEqual({});
    });
  });

  test('defines the exact cross-client state and timestamp fields', () => {
    expect(conversation.fields).toEqual(
      expect.objectContaining({
        clientConversationId: expect.any(Object),
        contextKey: expect.any(Object),
        deletedAt: expect.any(Object),
        isDeleted: expect.any(Object),
      }),
    );
    expect(member.fields).toEqual(
      expect.objectContaining({
        active: expect.any(Object),
        hiddenAt: expect.any(Object),
        isHidden: expect.any(Object),
        lastReadAt: expect.any(Object),
        typingExpiresAt: expect.any(Object),
        unreadCount: expect.any(Object),
      }),
    );
    expect(message.fields).toEqual(
      expect.objectContaining({
        deletedAt: expect.any(Object),
        isDeleted: expect.any(Object),
        isPinned: expect.any(Object),
        latestReply: expect.any(Object),
        linkURL: expect.any(Object),
        pinnedAt: expect.any(Object),
        replyCount: expect.any(Object),
      }),
    );
    expect(conversation.fields.expressions).toEqual({
      required: false,
      type: 'Array',
    });
    expect(message.fields.expressions).toEqual({
      required: false,
      type: 'Array',
    });
    expect(reaction.fields).toEqual(
      expect.objectContaining({
        deletedAt: expect.any(Object),
        isDeleted: expect.any(Object),
      }),
    );
    expect(reaction.indexes.reaction_unique_selection).toEqual({
      _p_message: 1,
      _p_user: 1,
    });
    expect(receipt.fields).toEqual(
      expect.objectContaining({
        deliveredAt: expect.any(Object),
        messageCreatedAt: expect.any(Object),
        readAt: expect.any(Object),
      }),
    );
  });

  test('versions every required compound index and its uniqueness', () => {
    const byName = indexDefinitions.reduce(
      (result, definition) => ({ ...result, [definition.name]: definition }),
      {},
    );

    expect(byName.member_conversation_user.unique).toBe(true);
    expect(byName.conversation_client_id).toEqual(
      expect.objectContaining({
        keys: [['_p_creator', 1], ['clientConversationId', 1]],
        partialFilterExpression: {
          clientConversationId: { $type: 'string' },
        },
        unique: true,
      }),
    );
    expect(byName.conversation_context_key).toEqual(
      expect.objectContaining({
        keys: [['contextKey', 1]],
        partialFilterExpression: {
          contextKey: { $type: 'string' },
        },
        unique: true,
      }),
    );
    expect(byName.member_user_visible.keys).toEqual([
      ['_p_user', 1],
      ['active', 1],
      ['isHidden', 1],
      ['updatedAt', -1],
    ]);
    expect(byName.message_client_id).toEqual(
      expect.objectContaining({
        className: 'Message',
        keys: [['_p_conversation', 1], ['clientMessageId', 1]],
        unique: true,
      }),
    );
    expect(byName.reaction_identity.unique).toBe(false);
    expect(byName.reaction_unique_selection).toEqual(
      expect.objectContaining({
        className: 'MessageReaction',
        keys: [['_p_message', 1], ['_p_user', 1]],
        unique: true,
      }),
    );
    expect(byName.receipt_identity.unique).toBe(true);
    expect(byName.message_history.keys).toEqual([
      ['_p_conversation', 1],
      ['isDeleted', 1],
      ['createdAt', -1],
    ]);
    expect(byName.message_history_cursor.keys).toEqual([
      ['_p_conversation', 1],
      ['createdAt', -1],
      ['_id', -1],
    ]);
    expect(byName.message_roots.keys).toEqual([
      ['_p_conversation', 1],
      ['_p_replyTo', 1],
      ['createdAt', -1],
      ['_id', -1],
    ]);
    expect(byName.message_reply.keys).toEqual([
      ['_p_replyTo', 1],
      ['createdAt', 1],
      ['_id', -1],
    ]);
    expect(byName.message_reply_active.keys).toEqual([
      ['_p_replyTo', 1],
      ['isDeleted', 1],
      ['createdAt', -1],
      ['_id', -1],
    ]);
    expect(byName.message_pins.keys).toEqual([
      ['_p_conversation', 1],
      ['isPinned', 1],
      ['pinnedAt', -1],
      ['_id', -1],
    ]);
  });
});
