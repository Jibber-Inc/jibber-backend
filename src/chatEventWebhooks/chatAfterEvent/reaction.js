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
  console.log('------ *****aaaaaa******* ------');
  const fromUser = await new Parse.Query(Parse.User).get(message.user.id);
  if (!fromUser) throw new Error('User not found!');
  console.log('------ *****bbbbbbbb******* ------');
  const latestReactions = message.latest_reactions;
  console.log('------ *****ccccccc******* ------', latestReactions);
  const reactionsFiltered = latestReactions.filter(
    reaction => reaction.type === REACTION_TYPES.READ,
  );
  console.log('------ *****dddddd******* ------');
  if (incomingReaction.type === REACTION_TYPES.READ) {
    console.log('------ *****eeeeeeee******* ------');

    const notice = await NoticeService.getNoticeByOwner(
      fromUser,
      NOTIFICATION_TYPES.UNREAD_MESSAGES,
    );

    if (notice) {
      const attributes = notice.get('attributes');
      const filteredAttributes = attributes.unreadMessages.filter(
        unreadMessage => unreadMessage.messageId !== message.id,
      );
      notice.set('attributes', {
        ...attributes,
        unreadMessages: filteredAttributes,
      });
      notice.save(null, { useMasterKey: true });
    }
  }
  console.log('------ *****ffffffff******* ------');

  if (
    reactionsFiltered.length &&
    reactionsFiltered[0].user_id &&
    message.context &&
    message.context === MESSAGE.CONTEXT.TIME_SENSITIVE
  ) {
    console.log('------ *****gggggggg******* ------');

    const toUser = await new Parse.Query(Parse.User).get(
      reactionsFiltered[0].user_id,
    );

    if (!toUser) throw new Error('No destination user found!');

    const fullName = UserUtils.getFullName(toUser);
    console.log('------ *****hhhhhhhh******* ------');

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
    console.log('------ *****iiiiiiiiiii******* ------');
    await PushService.sendPushNotificationToUsers(data, [fromUser]);
  }
  console.log('------ *****jjjjjj******* ------');
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
