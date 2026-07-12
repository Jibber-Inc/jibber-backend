// Vendor
import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import { assertMinimumAppVersion } from '../utils/appVersion';

// Services
import ChatService from '../services/ChatService';

export class CreateConversationError extends ExtendableError { }

/**
 * Create a connection
 * @param {*} request
 * @param {*} response
 */
const createConversation = async request => {
  const { params, user } = request;
  const { conversationId, type, members = [], title } = params;
  if (!(user instanceof Parse.User)) {
    throw new CreateConversationError('Authentication is required.');
  }
  if (process.env.PARSE_MESSAGING_ENABLED === 'false') {
    throw new CreateConversationError('Parse messaging is not enabled.');
  }
  assertMinimumAppVersion(request);
  try {
    const conversation = await ChatService.createConversation(
      user,
      conversationId,
      type,
      title,
      members,
    );

    return {
      conversation,
    };
  } catch (error) {
    throw new CreateConversationError(error.message);
  }
};

export default createConversation;
