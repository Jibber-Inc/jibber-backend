// import Parse from '../../providers/ParseProvider';
// import { NOTIFICATION_TYPES } from '../../constants';
// import NoticeService from '../../services/NoticeService';
// import UserUtils from '../../utils/userData';
// import PushService from '../../services/PushService';

/**
 *
 * @param {*} request
 * @param {*} response
 */
const newMessage = async (request, response) => {
  // const {
  //   // eslint-disable-next-line camelcase
  //   channel_id,
  //   message,
  //   user,
  //   members,
  // } = request.body;
  // // TODO: Use attributes
  // const fromUser = await new Parse.Query(Parse.User).get(message.user.id);
  // const pushStatus = {};
  try {
    // const { context } = message;
    // const usersIdentities = members
    //   .map(m => m.user_id)
    //   .filter(u => u !== user.id);
    // const users = usersIdentities.map(uid => Parse.User.createWithoutData(uid));

    // if (users.length && context === 'emergency') {
    //   // Set the data for the alert message Notice object
    //   const noticeData = {
    //     type: NOTIFICATION_TYPES.ALERT_MESSAGE,
    //     body: message.text,
    //     attributes: {
    //       channelId: channel_id,
    //       messageId: message.id,
    //       author: user.id,
    //     },
    //     priority: 1,
    //     fromUser,
    //   };
    //   // Create the Notice object
    //   await NoticeService.createNotice(noticeData);

    //   // Set the data for the alert message push notification
    //   const fullName = UserUtils.getFullName(fromUser);
    //   const data = {
    //     messageId: message.id,
    //     channelId: channel_id,
    //     identifier: message.id + context,
    //     title: `🚨 ${fullName}`,
    //     body: message.text,
    //     target: 'channel',
    //     interruptionLevel: getInterruptionLevel()
    //   };
    //   // Send the push notification
    //   pushStatus = await PushService.sendPushNotificationToUsers(
    //     NOTIFICATION_TYPES.ALERT_MESSAGE,
    //     data,
    //     users,
    //   );
    // }

    // return response.status(200).json(pushStatus);
    return response.status(200).json();
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
const updated = (request, response) => {
  try {
    // let pushStatus = {};
    // const {
    //   channel_id,
    //   message,
    //   // The user that modified the message
    //   user,
    // } = request.body;

    // // if (!Attributes) throw new Error('No Attributes present on the resquest.');
    // // const { consumers = [], context = '' } = JSON.parse(Attributes);
    // const consumers = [];
    // const context = 'emergency';
    // // Get the Parse.Users for author and reader
    // const [author, reader] = await Promise.all([
    //   new Parse.Query(Parse.User).get(message.user.id, { useMasterKey: true }),
    //   new Parse.Query(Parse.User).get(user.id, {
    //     useMasterKey: true,
    //   }),
    // ]);

    // // If the messages has emergency context,
    // // FIXME: Consumers array && context
    // // send a push notification that it has been read
    // if (context === 'emergency') {
    // // if (consumers.includes(ModifiedBy) && context === 'emergency') {
    //   const body = `${reader.get('giveName')} ${reader.get(
    //     'familyName',
    //   )} read: ${message.text}`;
    //   const data = {
    //     messageId: message.id,
    //     channelId: channel_id,
    //     identifier: `${channel_id}read${reader.id}`,
    //     title: 'Message Read 🤓',
    //     body,
    //     target: 'channel',
    //   };
    //   pushStatus = await PushService.sendPushNotificationToUsers(
    //     NOTIFICATION_TYPES.MESSAGE_READ,
    //     data,
    //     [author],
    //   );
    // }

    // return response.status(200).json(pushStatus);
    return response.status(200).json();
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};

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


const getInterruptionLevel = (message, focusSatus) => {
  if(message === 'time-sensitive'){
    return 'interruption-level'
  }

  if(focusSatus === 'focused' ){
     return'passive';
  }

  return 'active';
}

export default {
  new: newMessage,
  read,
  updated,
  deleted,
  flagged,
  unflagged,
};
