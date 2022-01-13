// Providers
import Stream from '../providers/StreamProvider';
// Services
import ChatService from '../services/ChatService';
import UserService from '../services/UserService';

/**
 * Send a Chat message
 * @param {Object} request
 */
const addReaction = async request => {
  const { params, user } = request;
  const { messageId, conversationCid } = params;

  if (!messageId) throw new Error('A messageId is required');

  if (!conversationCid) throw new Error('A conversationCid is required');
  try {

    const conversation = await ChatService.getConversationByCid(
      conversationCid,
    );
    
    const reactionType = 'reaction.new'

    const reaction = ChatService.sendReactionToMessage(conversation, messageId, reactionType, user.id);

    return reaction;
  } catch (error) {
    throw error.message;
  }
};

export default addReaction;
