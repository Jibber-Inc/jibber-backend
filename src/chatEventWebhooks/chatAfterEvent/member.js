import ChatService from "../../services/ChatService";
import EventWrapper from '../../utils/eventWrapper';
import UserUtils from '../../utils/userData';

/**
 * On member added webhook.
 *
 * @param {*} request
 * @param {*} response
 */
const added = async (request, response) => {
  const {
    conversationCid,
    user,
  } = EventWrapper.getParams(request.body);
  console.log(' ***** MEMBER . ADDED ')
  try {
    console.log(' ***** ***** ***** **** ')

    const conversation = await ChatService.getConversationByCid(conversationCid);

    console.log(' ***** ***** PASO  ***** **** ')
    const fullName = UserUtils.getFullName(user);
    const message = {
      text: `${fullName} has joined the conversation.`,
      type: 'system',
      context: 'casual',
      user_id: user.id,
      attributes: JSON.stringify({
        context: 'casual',
      })
    };

    await ChatService.createMessage(message, conversation);
    
    return response.status(200).end();
  } catch (error) {
    console.warn('Error - member.added', error);
    return response.status(500).json(error)
  }
};

/**
 *
 * @param {*} request
 * @param {*} response
 */
const updated = (request, response) => response.status(200).json();

/**
 * On member added webhook.
 *
 * @param {*} request
 * @param {*} response
 */
const removed = async (request, response) => {
  const {
    conversationCid,
    user,
  } = EventWrapper.getParams(request.body);
  try {
    const conversation = await ChatService.getConversationByCid(conversationCid);
    const fullName = UserUtils.getFullName(user);
    const message = {
      text: `${fullName} has left the conversation.`,
      type: 'system',
      context: 'casual',
      user_id: user.id,
      attributes: JSON.stringify({
        context: 'casual',
      })
    };
    const messageCreated = await ChatService.createMessage(message, conversation);
    return response.status(200).json(messageCreated);
  } catch (error) {
    console.warn('Error - member.added', error);
    return response.status(500).json(error)
  }
};

export default {
  added,
  updated,
  removed,
};
