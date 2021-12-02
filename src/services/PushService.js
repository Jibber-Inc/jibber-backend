import Parse from '../providers/ParseProvider';
import { NOTIFICATION_TYPES } from '../constants';
import { Channel } from 'stream-chat';

const sendToChannel = () => ({
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

const prepareNotificationData = (notificationType, data = {}, users = {}) => {
 
  console.log('ASDSADASDADDA');
  console.log(users);

  const { title, body, category, ...rest } = data;
  let alert = {};
  let aps = {};

  if (body) {
    alert = { ...alert, body };
  }

  aps = {
    ...aps,
    alert: {
       'title': title || null,
       'body': 'xxx'
    },
    threadId: 1,
    category: "NEW_MESSAGE",
    interruptionLevel:'asd',
    mutableContent: 1
  };

  const d = {
    target: 6,
    conversationId: 7,
    messageId: 8,
    author: 9
  }


  const stream = {
    target: "conversation",
    sender: "stream.chat",
    type: notificationType,
    version: "v1",
    author: 'jaun p',
    id: 1234,
    cid: 6546
  }

  const toREturn  = {
    aps,
    d,
    stream
  };
 
  console.log(toREturn);

  return {
    aps,
    priority: 10,
    push_type: 'alert',
    data: rest,
  };
};

const sendPushNotificationToUsers = async (notificationType, data, users = []) => {
  const customData = prepareNotificationData(notificationType, data, users);
  return sendToUsers(customData, users);
};

export default {
  sendToChannel,
  sendPushNotificationToUsers,
};
