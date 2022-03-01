// Vendor
import ExtendableError from 'extendable-error-class';

// Services
import ChatService from '../services/ChatService';

export class CreateConversationError extends ExtendableError { }

/**
 * Create a connection
 * @param {*} request
 * @param {*} response
 */
const createConversation = async request => {
  const { params } = request;
  const { owner, conversationId, type, members, title } = params;
  try {
    // create conversation
    const conversation = await ChatService.createConversation(
      owner,
      conversationId,
      type,
      title,
      members
    );

    return {
      conversation,
    };
  } catch (error) {
    throw new CreateConversationError(error.message);
  }
};

export default createConversation;
