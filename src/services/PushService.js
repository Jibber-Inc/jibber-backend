import Parse from '../providers/ParseProvider';

const sendToConversation = () => ({
  result: 'needs to be implemented',
});

const sendToUsers = async (data, users = []) => {
  if (!data) throw new Error('Cannot send notificaction. Data is required');
  // Find sessions of the user.
  const query = new Parse.Query(Parse.Session);
  query.containedIn('user', users);
  const now = new Date();
  query.greaterThan('expiresAt', now);
  // Find installations associated with the user
  const pushQuery = new Parse.Query(Parse.Installation);
  pushQuery.matchesKeyInQuery('installationId', 'installationId', query);

  // Send push notification to query
  return Parse.Push.send(
    {
      where: pushQuery,
      data,
    },
    {
      useMasterKey: true,
    },
  );
};

const prepareNotificationData = (data = {}) => {
 
  console.log('********************* BBB');

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
    type= "message.new",
  } = data;

  console.log('******************** AAA');

  const notification = {
    aps : {
      alert: {
        title,
        body,
      },
      'thread-id':threadId,
      category,
      'interruption-level': interruptionLevel,
      'mutable-content': mutableContent,
      connectionId
    },
    data: {
      target,
      conversationId: conversationCid,
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
    }
    
  } 

  console.log(notification);

  return notification;
 }; 

const sendPushNotificationToUsers = async (data, users = []) => {
  const customData = prepareNotificationData(data);
  return sendToUsers(customData, users);
};

export default {
  sendToConversation,
  sendPushNotificationToUsers,
};
