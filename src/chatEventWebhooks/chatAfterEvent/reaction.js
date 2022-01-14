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

  const { message, cid } = EventWrapper.getParams(
    request.body,
  );
  
  console.log('aaaaaaa /*********');
  const latestReactions = message.latest_reactions;
  console.log(latestReactions);
  const reactionsFiltered = latestReactions.filter(reaction => reaction.type === 'read');
  console.log('bbbbbb /*********', reactionsFiltered);
  if(reactionsFiltered.lenght){
    const fromUser = await new Parse.Query(Parse.User).get(message.user.id);
    const fullName = UserUtils.getFullName(fromUser);
    console.log('cccccccc /*********');
    const data = {
      messageId: null,
      conversationCid: cid,
      title: `${fullName} read your message 🤓`,
      body: `${fullName} read ${message.text} `,
      target: 'channel',
      category: 'message.read',
      interruptionLevel: 'time-sensitive',
      threadId: cid,
      author: fromUser.id
    };

    console.log( 'dasdasdadadad')
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
