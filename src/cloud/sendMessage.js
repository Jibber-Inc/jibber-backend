// Providers
import Parse from '../providers/ParseProvider';
import Stream from '../providers/StreamProvider';
// Services
import ChatService from '../services/ChatService';
import UserService from '../services/UserService';

/**
 * Send a Chat message
 * @param {Object} request
 */
const sendMessage = async request => {
  const { params } = request;
  const { ownerId, conversationId, message } = params;

  if (!ownerId) throw new Error('A logged user is required');

  if (!conversationId) throw new Error('A conversationId is required');

  if (!message || !message.text) throw new Error('A message.text is required');

  try {
    const owner = await new Parse.Query(Parse.User).get(ownerId);
    await UserService.connectUser(owner);
    const filter = { id: { $eq: conversationId } };
    const sort = [{ last_message_at: -1 }];
    const options = { message_limit: 0, limit: 1, state: true };

    const queryConversationsResponse = await Stream.client.queryConversations(
      filter,
      sort,
      options,
    );

    if (!queryConversationsResponse.length)
      throw new Error("There's no conversation with the given conversation ID");

    const conversation = queryConversationsResponse[0];

    message.user_id = owner.id;

    const messageCreated = await ChatService.createMessage(
      message,
      conversation,
    );

    await UserService.disconnectUser();

    return messageCreated;
  } catch (error) {
    throw error.message;
  }
};

export default sendMessage;
