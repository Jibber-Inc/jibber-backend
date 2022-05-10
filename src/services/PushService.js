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
    messageId,
    target = 'conversation',
    author,
    version = 'v1',
    interruptionLevel,
    connectionId,
    threadId,
    mutableContent = 1,
    sender = 'stream.chat',
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
      'conversationId': conversationCid,
      messageId,
      author,
    },
    stream: {
      target,
      sender,
      type,
      version,
      author,
      id: messageId,
      cid: conversationCid,
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

export default {
  sendPushNotificationToUsers,
};
