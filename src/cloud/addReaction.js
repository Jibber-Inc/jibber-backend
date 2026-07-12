import Parse from '../providers/ParseProvider';
import ChatService from '../services/ChatService';
import { REACTION_TYPES } from '../constants';
import { assertMinimumAppVersion } from '../utils/appVersion';

/**
 * Send a Chat message
 * @param {Object} request
 */
const addReaction = async request => {
  const { params, user } = request;
  const { messageId, conversationCid } = params;

  if (!(user instanceof Parse.User)) throw new Error('Authentication is required.');
  if (process.env.PARSE_MESSAGING_ENABLED === 'false') {
    throw new Error('Parse messaging is not enabled.');
  }
  assertMinimumAppVersion(request);
  if (!messageId) throw new Error('A messageId is required');
  if (!conversationCid) throw new Error('A conversationCid is required');
  return ChatService.sendReactionToMessage(
    conversationCid,
    messageId,
    REACTION_TYPES.READ,
    user.id,
  );
};

export default addReaction;
