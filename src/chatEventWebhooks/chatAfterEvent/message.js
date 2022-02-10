import Parse from '../../providers/ParseProvider';
import UserUtils from '../../utils/userData';
import PushService from '../../services/PushService';
import EventWrapper from '../../utils/eventWrapper';
import NoticeService from '../../services/NoticeService';
import { NOTIFICATION_TYPES } from '../../constants';

/**
 * Given a context and a focus-status, returns an interruption-level
 *
 * @param {*} context
 * @param {*} focusSatus
 * @returns
 */
 const getInterruptionLevel = (context) => {
  if (context === 'time-sensitive') {
    return 'time-sensitive';
  }

  return 'active';
};

/**
 *
 * @param {*} request
 * @param {*} response
 */
const newMessage = async (request, response) => {
  const { conversationCid, message, user, members } = EventWrapper.getParams(
    request.body,
  );
 
  // TODO: Use attributes
  const fromUser = await new Parse.Query(Parse.User).get(message.user.id);

  const connection = await new Parse.Query('Connection')
    .equalTo('channelSId', conversationCid)
    .find({ useMasterKey: true });
  const connectionId =
    (connection && connection.length && connection[0].id) || null;

  try {
    const { context } = message;

    const usersIdentities = members
      .map(m => m.user_id)
      .filter(u => u !== user.id);
    const users = usersIdentities.map(uid => Parse.User.createWithoutData(uid));
    const notice = await NoticeService.getNoticeByOwner(fromUser, NOTIFICATION_TYPES.UNREAD_MESSAGES);
    
    if(notice){
      const attributes = notice.get('attributes');

      attributes.unreadMessageIds.push(message.id);
  
      notice.set('attributes', attributes);
      notice.save(null, { useMasterKey: true });
    }
    
    // Set the data for the alert message push notification
    const fullName = UserUtils.getFullName(fromUser);

    console.log('NUEVO MENSAJE........ *******')
    console.log(message)
    console.log(message.context)
    console.log(message.attributes)


    const data = {
      messageId: message.id,
      conversationCid,
      identifier: message.id + context,
      title: `${fullName}`,
      body: message.text,
      target: 'conversation',
      category: 'MESSAGE_NEW',
      interruptionLevel: getInterruptionLevel(message.context),
      threadId: conversationCid,
      author: fromUser.id,
      connectionId,
    };

    // Send the push notification
    await PushService.sendPushNotificationToUsers(data, users);

    return response.status(200).end();
  } catch (error) {
    console.warn('Error - message.newMessage', error);
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
    //   conversationId,
    //   message,
    //   user,
    // } = EventWrapper.getParams(request.body);

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
    //     channelId: conversationId,
    //     identifier: `${conversationId}read${reader.id}`,
    //     title: 'Message Read 🤓',
    //     body,
    //     target: 'channel',
    //   };
    //   pushStatus = await PushService.sendPushNotificationToUsers(
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

export default {
  new: newMessage,
  read,
  updated,
  deleted,
  flagged,
  unflagged,
};
