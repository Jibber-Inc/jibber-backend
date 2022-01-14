import EventWrapper from '../../utils/eventWrapper';
import UserUtils from '../../utils/userData';
import Parse from '../../providers/ParseProvider';
import PushService from '../../services/PushService';

/**
 *
 * @param {*} request
 * @param {*} response
 */
const newReaction = async (request, response) => {
  const { message, conversationCid } = EventWrapper.getParams(
    request.body,
  );

  const latestReactions = message.latest_reactions;
  const reactionsFiltered = latestReactions.filter(reaction => reaction.type === 'read');
  console.log('AAAAA')
  if(reactionsFiltered.length){
    const fromUser = await new Parse.Query(Parse.User).get('i0qjTwtr24');
    console.log('BBBB')
    if (!fromUser) throw new Error('User not found!');
    console.log('CCCCC')
    const toUser = await new Parse.Query(Parse.User).get(reactionsFiltered[0].user_id);
    console.log('DDDDD')
    const fullName = UserUtils.getFullName(toUser);
    console.log('EEEEE')
    const data = {
      messageId: null,
      conversationCid,
      title: `${fullName} read your message 🤓`,
      body: `${fullName} read ${message.text} `,
      target: 'channel',
      category: 'message.read',
      interruptionLevel: 'time-sensitive',
      threadId: conversationCid,
      author: fromUser.id
    };

    console.log( '*************************/////////')
    console.log(data);

    await PushService.sendPushNotificationToUsers(
      data,
      [fromUser],
    )
  }
}

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
