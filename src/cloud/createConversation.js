// Vendor
import ExtendableError from 'extendable-error-class';

// Services
import ChatService from '../services/ChatService';

export class CreateConversationError extends ExtendableError {}

/**
 * Create a connection
 * @param {*} request
 * @param {*} response
 */
const createConversation = async request => {
  const { user, params } = request;
  const { uniqueName, friendlyName, type, members, attributes } = params;
  try {
    if (!user) throw new CreateConversationError('User need to be authenticated.');
    // create conversation
    const conversation = await ChatService.createConversation(
      user,
      uniqueName,
      friendlyName,
      type,
      attributes,
    );

    // add request user and members to member conversation list
    await ChatService.addMembersToConversation(conversation.sid, [user.id, ...members]);

    return {
      conversation: conversation.sid,
    };
  } catch (error) {
    throw new CreateConversationError(error.message);
  }
};

export default createConversation;
