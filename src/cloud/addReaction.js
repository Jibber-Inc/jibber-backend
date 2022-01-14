<<<<<<< HEAD
// Services
import ChatService from '../services/ChatService';
=======
// Providers
import Stream from '../providers/StreamProvider';
// Services
import ChatService from '../services/ChatService';
import UserService from '../services/UserService';
>>>>>>> 3b208e9 (feat(): add endpoint to send reaction)

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
    
<<<<<<< HEAD
    const reactionType = 'read'
=======
    const reactionType = 'reaction.new'
>>>>>>> 3b208e9 (feat(): add endpoint to send reaction)

    const reaction = ChatService.sendReactionToMessage(conversation, messageId, reactionType, user.id);

    return reaction;
  } catch (error) {
    throw error.message;
  }
};

export default addReaction;
