jest.mock('../../providers/ParseProvider', () => ({
  __esModule: true,
  default: {},
}));

const PushService = require('../../services/PushService').default;

const baseData = {
  author: 'user-1',
  body: 'Hello',
  conversationId: 'conversation-1',
  messageId: 'message-1',
  title: 'Benji',
};

describe('Parse messaging push payloads', () => {
  test.each([
    ['respectful', 'passive'],
    ['conversational', 'active'],
    ['time-sensitive', 'time-sensitive'],
  ])('maps %s delivery to %s interruption', (deliveryType, interruptionLevel) => {
    const payload = PushService.prepareMessagingNotificationData({
      ...baseData,
      deliveryType,
    });
    expect(payload.aps['interruption-level']).toBe(interruptionLevel);
  });

  test('increments the badge only for time-sensitive messages', () => {
    const normal = PushService.prepareMessagingNotificationData({
      ...baseData,
      deliveryType: 'conversational',
    });
    const urgent = PushService.prepareMessagingNotificationData({
      ...baseData,
      deliveryType: 'time-sensitive',
    });
    expect(normal.aps.badge).toBeUndefined();
    expect(urgent.aps.badge).toBe('Increment');
  });

  test('includes category, thread, and Parse-native deep-link identifiers', () => {
    const payload = PushService.prepareMessagingNotificationData({
      ...baseData,
      deliveryType: 'respectful',
    });
    expect(payload.aps).toEqual(
      expect.objectContaining({
        category: 'MESSAGE_NEW',
        'mutable-content': 1,
        'thread-id': 'conversation-1',
      }),
    );
    expect(payload.data).toEqual(
      expect.objectContaining({
        conversationId: 'conversation-1',
        messageId: 'message-1',
        target: 'conversation',
        threadRootId: 'message-1',
      }),
    );
    expect(payload.messaging).toEqual(
      expect.objectContaining({
        sender: 'parse.messaging',
        threadRootId: 'message-1',
      }),
    );
    expect(Object.keys(payload).sort()).toEqual(['aps', 'data', 'messaging']);
  });

  test('keeps a reply notification anchored to its root message', () => {
    const payload = PushService.prepareMessagingNotificationData({
      ...baseData,
      messageId: 'reply-1',
      threadRootId: 'message-1',
    });

    expect(payload.data.threadRootId).toBe('message-1');
    expect(payload.messaging.threadRootId).toBe('message-1');
    expect(payload.data.messageId).toBe('reply-1');
    expect(payload.messaging.id).toBe('reply-1');
  });
});
