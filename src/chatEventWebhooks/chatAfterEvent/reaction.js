import EventWrapper from '../../utils/eventWrapper';
import UserUtils from '../../utils/userData';
import Parse from '../../providers/ParseProvider';
import PushService from '../../services/PushService';
import NoticeService from '../../services/NoticeService';
import db from '../../utils/db';

/**
 *
 * @param {*} request
 * @param {*} response
 */
const newReaction = async (request, response) => {
  const {
    message,
    conversationCid,
    reaction: newReaction,
  } = EventWrapper.getParams(request.body);

  const fromUser = await new Parse.Query(Parse.User).get(message.user.id);

  if (!fromUser) throw new Error('User not found!');

  const latestReactions = message.latest_reactions;
  const reactionsFiltered = latestReactions.filter(
    reaction => reaction.type === 'read',
  );

  console.log('aaaaaaa', newReaction.type)

  if (newReaction.type === 'read') {
    console.log('entro')
    const notice = await NoticeService.getNoticeByOwner(fromUser);

    const currentUnreadCount = await db.getPreviousValueForSequence(
      `notice_${notice.id}`,
    );

    const attributes = notice.get('attributes');

    notice.set('attributes', {
      ...attributes,
      unreadCount: currentUnreadCount,
    });

    notice.save(null, { useMasterKey: true });
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
