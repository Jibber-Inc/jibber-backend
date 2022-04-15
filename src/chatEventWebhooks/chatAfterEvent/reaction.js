import EventWrapper from '../../utils/eventWrapper';
import UserUtils from '../../utils/userData';
import Parse from '../../providers/ParseProvider';
import PushService from '../../services/PushService';
import NoticeService from '../../services/NoticeService';
import { NOTIFICATION_TYPES, INTERRUPTION_LEVEL_TYPES, REACTION_TYPES, MESSAGE } from '../../constants';

/**
 *
 * @param {*} request
 * @param {*} response
 */
const newReaction = async (request, response) => {
  const {
    message,
    conversationCid,
    reaction: incomingReaction,
  } = EventWrapper.getParams(request.body);
  console.log('AAAAAAA');
  const fromUser = await new Parse.Query(Parse.User).get(message.user.id);

  if (!fromUser) throw new Error('User not found!');

  const latestReactions = message.latest_reactions;
  console.log('BBBBBB', latestReactions);
  const reactionsFilteredByTypeRead = latestReactions.filter(
    reaction => reaction.type === REACTION_TYPES.READ,
  );
  console.log('CCCCCC');
  if (incomingReaction.type === REACTION_TYPES.READ) {
    const notice = await NoticeService.getNoticeByOwner(
      fromUser,
      NOTIFICATION_TYPES.UNREAD_MESSAGES,
    );
    console.log('EEEEEE');
    if (notice) {
      const attributes = notice.get('attributes');

      if (attributes && attributes.unreadMessages) {
        const filteredAttributes = attributes.unreadMessages.filter(
          unreadMessage => unreadMessage.messageId !== message.id,
        );
        notice.set('attributes', {
          ...attributes,
          unreadMessages: filteredAttributes,
        });
        await notice.save(null, { useMasterKey: true });
      }
    }
  }

  console.log('DDDDDD')
  
  if (incomingReaction.type === REACTION_TYPES.READ && message.context === MESSAGE.CONTEXT.TIME_SENSITIVE) {
    console.log('BBBB', reactionsFilteredByTypeRead)
    const readerIds = reactionsFilteredByTypeRead.map(reaction => reaction.user_id);
    console.log('CCCCC', readerIds)   
    await NoticeService.createOrUpdateMessageReadNotice(fromUser, conversationCid, message.id, readerIds) 
  }

  if (
    reactionsFilteredByTypeRead.length &&
    reactionsFilteredByTypeRead[0].user_id &&
    message.context &&
    message.context === MESSAGE.CONTEXT.TIME_SENSITIVE
  ) {
    const toUser = await new Parse.Query(Parse.User).get(
      reactionsFilteredByTypeRead[0].user_id,
    );

    if (!toUser) throw new Error('No destination user found!');

    const fullName = UserUtils.getFullName(toUser);

    const data = {
      messageId: message.id,
      conversationCid,
      title: `${fullName} read your message 🤓`,
      body: `${fullName} read ${message.text} `,
      target: 'conversation',
      category: 'stream.chat',
      interruptionLevel: INTERRUPTION_LEVEL_TYPES.PASSIVE,
      threadId: conversationCid,
      author: toUser.id,
    };
    await PushService.sendPushNotificationToUsers(data, [fromUser]);
  }

  return response.status(200).end();
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
