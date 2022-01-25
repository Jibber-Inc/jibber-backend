import EventWrapper from '../../utils/eventWrapper';
import UserUtils from '../../utils/userData';
import Parse from '../../providers/ParseProvider';
import PushService from '../../services/PushService';
import NoticeService from '../../services/NoticeService';
import { NOTIFICATION_TYPES } from '../../constants';

/**
 *
 * @param {*} request
 * @param {*} response
 */
const newReaction = async (request) => {
  const {  message,  conversationCid,  reaction:incomingReaction } = EventWrapper.getParams(request.body);

  const fromUser = await new Parse.Query(Parse.User).get(message.user.id);
  if (!fromUser) throw new Error('User not found!');

  const latestReactions = message.latest_reactions;
  const reactionsFiltered = latestReactions.filter(
    reaction => reaction.type === 'read',
  );

  if (incomingReaction.type === 'read') {
  
    const notice = await NoticeService.getNoticeByOwner(fromUser, NOTIFICATION_TYPES.UNREAD_MESSAGES);
   
    if(notice){
      const attributes = notice.get('attributes');
      const filteredAttributes = attributes.unreadMessageIds.filter(messageId => messageId !== message.id);
  
      notice.set('attributes', {
        ...attributes,
        unreadMessageIds: filteredAttributes
      });
     
      notice.save(null, { useMasterKey: true });
    }
  }

  if (reactionsFiltered.length && reactionsFiltered[0].user_id) {
    const toUser = await new Parse.Query(Parse.User).get(
      reactionsFiltered[0].user_id,
    );

    if (!toUser) throw new Error('No destination user found!');

    const fullName = UserUtils.getFullName(toUser);

    const data = {
      messageId: null,
      conversationCid,
      title: `${fullName} read your message 🤓`,
      body: `${fullName} read ${message.text} `,
      target: 'channel',
      category: 'message.read',
      interruptionLevel: 'time-sensitive',
      threadId: conversationCid,
      author: fromUser.id,
    };

    await PushService.sendPushNotificationToUsers(data, [fromUser]);
  }
};

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

export default {
  new: newReaction,
  updated,
  deleted,
};
