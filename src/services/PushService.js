import Parse from '../providers/ParseProvider';

/**
 * Sends the push notif to the given users
 * 
 * @param {*} data 
 * @param {*} users 
 * @returns 
 */
const sendToUsers = async (data, users = []) => {
  if (!data) throw new Error('Cannot send notificaction. Data is required');
  // Find sessions of the user.
  const query = new Parse.Query(Parse.Installation);
  query.containedIn('user', users);
 
  // Send push notification to query
  return Parse.Push.send(
    {
      where: query,
      data,
    },
    {
      useMasterKey: true,
    },
  );
};

/**
 * Prepares the notification payload
 * 
 * @param {*} data 
 * @returns 
 */
const prepareNotificationData = (data = {}) => {
  const {
    category,
    title,
    body,
    conversationCid,
    conversationId = conversationCid,
    messageId,
    target = 'conversation',
    author,
    version = 'v1',
    interruptionLevel,
    connectionId,
    threadId,
    mutableContent = 1,
    sender = 'parse.messaging',
    type = 'message.new',
  } = data;

  const payload = {
    aps: {
      alert: {
        title,
        body,
      },
      'thread-id': threadId,
      category,
      'interruption-level': interruptionLevel,
      'mutable-content': mutableContent,
      connectionId,
    },
    data: {
      target,
      conversationId,
      messageId,
      author,
    },
    messaging: {
      target,
      sender,
      type,
      version,
      author,
      id: messageId,
      conversationId,
    },
  };

  return payload;
};

/**
 * Prepares & sends the notification to the given users
 * 
 * @param {*} data 
 * @param {*} users 
 * @returns 
 */
const sendPushNotificationToUsers = async (data, users = []) => {
  const customData = prepareNotificationData(data);
  return sendToUsers(customData, users);
};

/**
 * Builds the Parse-native messaging notification payload using Parse object
 * IDs as the only canonical conversation and message identifiers.
 */
const prepareMessagingNotificationData = (data = {}) => {
  const {
    author,
    body,
    conversationId,
    deliveryType = 'respectful',
    messageId,
    title,
  } = data;
  const interruptionLevels = {
    conversational: 'active',
    respectful: 'passive',
    'time-sensitive': 'time-sensitive',
  };
  const aps = {
    alert: {
      title,
      body,
    },
    category: 'MESSAGE_NEW',
    'interruption-level': interruptionLevels[deliveryType] || 'passive',
    'mutable-content': 1,
    'thread-id': conversationId,
  };
  if (deliveryType === 'time-sensitive') aps.badge = 'Increment';

  return {
    aps,
    data: {
      author,
      conversationId,
      deliveryType,
      messageId,
      target: 'conversation',
    },
    messaging: {
      author,
      conversationId,
      deliveryType,
      id: messageId,
      sender: 'parse.messaging',
      type: 'message.new',
      version: 'v1',
    },
  };
};

const sendMessagingPushNotification = async (data, users = []) =>
  sendToUsers(prepareMessagingNotificationData(data), users);

export default {
  prepareMessagingNotificationData,
  sendMessagingPushNotification,
  sendPushNotificationToUsers,
};
