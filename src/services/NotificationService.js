import Parse from '../providers/ParseProvider';

/**
 * Creates a Notification object with the given data
 *
 * @param {*} data
 * @returns
 */
const createNotification = data => {
  const { type, body, attributes, priority, user } = data;

  const notification = new Parse.Object('Notification');

  notification.set('type', type);
  notification.set('body', body);
  notification.set('attributes', attributes);
  notification.set('priority', priority);
  notification.setACL(new Parse.ACL(user));

  notification.save(null, { useMasterKey: true });
  return notification;
};

export default {
  createNotification,
};
