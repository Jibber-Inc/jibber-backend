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
  const { user, params } = request;
  const { owner, conversationId, type } = params;
  try {
    if (!user) throw new CreateConversationError('User need to be authenticated.');
    // create conversation
    const conversation = await ChatService.createConversation(
      owner,
      conversationId,
      type
    );

    // add request user and members to member conversation list
    // await ChatService.addMembersToConversation(conversation.sid, [user.id, ...members]);

    return {
      conversation,
    };
  } catch (error) {
    throw new CreateConversationError(error.message);
  }
};

export default createConversation;
