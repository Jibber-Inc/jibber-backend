import { NOTIFICATION_TYPES } from '../constants';

const send = async (message) =>
  Parse.Push.send(
    {
      channels: ['All'],
      data: {
        message,
      },
    },
    {
      useMasterKey: true,
    },
  );

const sendToUser = async (data, user) => {
  if (!data) throw new Error('Cannot send notificaction. Data is required');
  // Find sessions of the user.
  const query = new Parse.Query(Parse.Session);
  query.equalTo('user', user);
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

const prepareNotificationData = (type, message, extraData = {}) => {
  if (!Object.keys(NOTIFICATION_TYPES).includes(type)) {
    throw new Error(`Unsoported push notification type ${type}`);
  }

  const data = {
    aps: {
      'apns-priority': 5,
      'push_type': 'background',
    },
    push_type: 'background',
    type,
    message,
    data: extraData,
  };

  return data;
};

const sendPushNotificationToUser = async (
  type,
  message,
  extraData,
  user,
) => {
  const data = prepareNotificationData(type, message.trim(), extraData);
  return sendToUser(data, user);
};

export default {
  send,
  sendPushNotificationToUser,
};
