import { NOTIFICATION_TYPES } from '../constants';

const sendToChannel = () => ({
  result: 'needs to be implemented'
})

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

const prepareNotificationData = (type, data = {}) => {
  if (!Object.keys(NOTIFICATION_TYPES).includes(type)) {
    throw new Error(`Unsoported push notification type ${type}`);
  }

  return {
    'content-available': 1,
    push_type: 'background',
    priority: 5,
    data,
  };
};

const sendPushNotificationToUser = async (
  type,
  data,
  user,
) => {
  const customData = prepareNotificationData(type, data);
  return sendToUser(customData, user);
};

export default {
  sendToChannel,
  sendPushNotificationToUser,
};
