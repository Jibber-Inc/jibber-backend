import Parse from '../../providers/ParseProvider';
import { NOTIFICATION_TYPES } from '../../constants';
import NoticeService from '../../services/NoticeService';
import UserUtils from '../../utils/userData';
import PushService from '../../services/PushService';

/**
 *
 * @param {*} request
 * @param {*} response
 */
const newMessage = async (request, response) => {
  const {
    // eslint-disable-next-line camelcase
    channel_id,
    message,
    user,
    members,
  } = request.body;
  const fromUser = await new Parse.Query(Parse.User).get(message.user.id);
  let pushStatus = {};
  try {
    // if (!Attributes) throw new Error('No Attributes present on the resquest.');
    // const { context } = JSON.parse(Attributes);
    const context = 'emergency';
    const usersIdentities = members
      .map(m => m.user_id)
      .filter(u => u !== user.id);
    const users = usersIdentities.map(uid => Parse.User.createWithoutData(uid));

    if (users.length) {
      if (context === 'emergency') {
        // Set the data for the alert message Notice object
        const noticeData = {
          type: NOTIFICATION_TYPES.ALERT_MESSAGE,
          body: message.text,
          attributes: {
            channelId: channel_id,
            messageId: message.id,
            author: user.id,
          },
          priority: 1,
          fromUser,
        };
        // Create the Notice object
        await NoticeService.createNotice(noticeData);

        // Set the data for the alert message push notification
        const fullName = UserUtils.getFullName(fromUser);
        const data = {
          messageId: message.id,
          channelId: channel_id,
          identifier: message.id + context,
          title: `🚨 ${fullName}`,
          body: message.text,
          target: 'channel',
        };
        // Send the push notification
        pushStatus = await PushService.sendPushNotificationToUsers(
          NOTIFICATION_TYPES.ALERT_MESSAGE,
          data,
          users,
        );
      }
    }

    return response.status(200).json(pushStatus);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};

/**
 *
 * @param {*} request
 * @param {*} response
 */
const read = (request, response) => response.status(200).json();

/**
 *
 * @param {*} request
 * @param {*} response
 */
const updated = (request, response) => response.status(200).json();

/**
 *
 * @param {*} request
 * @param {*} response
 */
const deleted = (request, response) => response.status(200).json();

/**
 *
 * @param {*} request
 * @param {*} response
 */
const flagged = (request, response) => response.status(200).json();

/**
 *
 * @param {*} request
 * @param {*} response
 */
const unflagged = (request, response) => response.status(200).json();

export default {
  new: newMessage,
  read,
  updated,
  deleted,
  flagged,
  unflagged,
};
