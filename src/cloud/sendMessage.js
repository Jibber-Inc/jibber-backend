import { v4 as uuidv4 } from 'uuid';
import Parse from '../providers/ParseProvider';
import ChatService from '../services/ChatService';
import { assertMinimumAppVersion } from '../utils/appVersion';

/**
 * Compatibility Cloud function for clients that still call `sendMessage`.
 * The authenticated Parse user is always the author; ownerId can no longer be
 * used to write on behalf of another user.
 */
const sendMessage = async request => {
  const { params, user } = request;
  const { ownerId, conversationId, message } = params;

  if (!(user instanceof Parse.User)) {
    throw new Error('A logged user is required');
  }
  if (ownerId && ownerId !== user.id) {
    throw new Error('ownerId must match the logged user');
  }
  if (process.env.PARSE_MESSAGING_ENABLED === 'false') {
    throw new Error('Parse messaging is not enabled.');
  }
  assertMinimumAppVersion(request);
  if (!conversationId) throw new Error('A conversationId is required');
  if (!message || !message.text) {
    throw new Error('A message.text is required');
  }

  return ChatService.createMessage(
    {
      ...message,
      clientMessageId:
        message.clientMessageId || `legacy-message:${uuidv4()}`,
      user_id: user.id,
    },
    conversationId,
  );
};

export default sendMessage;
