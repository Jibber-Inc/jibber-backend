import {
  ensureMessagingIndexes,
  getExistingIndexes,
  getIndexOptions,
  indexMatches,
  keysToObject,
} from '../../utils/messagingIndexes';

const definition = {
  className: 'Message',
  keys: [['_p_conversation', 1], ['clientMessageId', 1]],
  name: 'message_client_id',
  unique: true,
};

const partialDefinition = {
  className: 'Conversation',
  keys: [['_p_creator', 1], ['clientConversationId', 1]],
  name: 'conversation_client_id',
  partialFilterExpression: {
    clientConversationId: { $type: 'string' },
  },
  unique: true,
};

describe('messaging index migrations', () => {
  test('preserves compound key order', () => {
    expect(keysToObject(definition.keys)).toEqual({
      _p_conversation: 1,
      clientMessageId: 1,
    });
  });

  test('verifies keys and unique options', () => {
    expect(
      indexMatches(
        {
          key: { _p_conversation: 1, clientMessageId: 1 },
          unique: true,
        },
        definition,
      ),
    ).toBe(true);
    expect(
      indexMatches(
        {
          key: { _p_conversation: 1, clientMessageId: 1 },
          unique: false,
        },
        definition,
      ),
    ).toBe(false);
  });

  test('preserves and verifies partial unique index options', () => {
    expect(getIndexOptions(partialDefinition)).toEqual({
      name: 'conversation_client_id',
      partialFilterExpression: {
        clientConversationId: { $type: 'string' },
      },
      unique: true,
    });
    expect(
      indexMatches(
        {
          key: { _p_creator: 1, clientConversationId: 1 },
          partialFilterExpression: {
            clientConversationId: { $type: 'string' },
          },
          unique: true,
        },
        partialDefinition,
      ),
    ).toBe(true);
    expect(
      indexMatches(
        {
          key: { _p_creator: 1, clientConversationId: 1 },
          unique: true,
        },
        partialDefinition,
      ),
    ).toBe(false);
  });

  test('creates a missing index and verifies persisted metadata', async () => {
    let indexes = [{ key: { _id: 1 }, name: '_id_' }];
    const collection = {
      createIndex: jest.fn(async (keys, options) => {
        indexes = indexes.concat({
          key: keys,
          name: options.name,
          unique: options.unique,
        });
      }),
      indexes: jest.fn(async () => indexes),
    };
    const database = { collection: jest.fn(() => collection) };

    await expect(ensureMessagingIndexes(database, [definition])).resolves.toEqual([
      'Message.message_client_id',
    ]);
    expect(collection.createIndex).toHaveBeenCalledWith(
      { _p_conversation: 1, clientMessageId: 1 },
      { name: 'message_client_id', unique: true },
    );
  });

  test('treats MongoDB 7 NamespaceNotFound as a fresh collection', async () => {
    const collection = {
      indexes: jest.fn().mockRejectedValue({ code: 26 }),
    };
    await expect(getExistingIndexes(collection)).resolves.toEqual([]);
  });

  test('fails rather than replacing an incompatible production index', async () => {
    const collection = {
      createIndex: jest.fn(),
      indexes: jest.fn(async () => [
        {
          key: { _p_conversation: 1, clientMessageId: 1 },
          name: 'message_client_id',
          unique: false,
        },
      ]),
    };
    const database = { collection: jest.fn(() => collection) };

    await expect(
      ensureMessagingIndexes(database, [definition]),
    ).rejects.toThrow('incompatible keys or options');
    expect(collection.createIndex).not.toHaveBeenCalled();
  });
});
