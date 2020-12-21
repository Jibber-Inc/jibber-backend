import Parse from '../providers/ParseProvider';
import { NOTIFICATION_TYPES } from '../constants';

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

const prepareNotificationData = (type, data = {}) => {
  if (!Object.keys(NOTIFICATION_TYPES).includes(type)) {
    throw new Error(`Unsoported push notification type ${type}`);
  }

  const { title, body, ...rest } = data;
  let alert = {};

  if (title) {
    alert = { title };
  }

  if (body) {
    alert = { ...alert, body };
  }

  return {
    aps: {
      alert,
    },
    priority: 10,
    push_type: 'alert',
    data: rest,
  };
};

const sendPushNotificationToUsers = async (type, data, users = []) => {
  const customData = prepareNotificationData(type, data);
  return sendToUsers(customData, users);
};

export default {
  sendToChannel,
  sendPushNotificationToUsers,
};
