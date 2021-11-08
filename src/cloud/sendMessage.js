// Providers
import Stream from '../providers/StreamProvider';
// Services
import ChatService from '../services/ChatService';
import UserService from '../services/UserService';

/**
 * Send a Chat message
 * @param {Object} request
 */
const sendMessage = async request => {
  const { params, user } = request;
  const { channelId, message } = params;

  await UserService.connectUser(user);

  if (!user) throw new Error('A logged user is required');
  if (!channelId) throw new Error('A channelId is required');
  if (!message || !message.text) throw new Error('A message.text is required');

  try {
    const filter = { id: channelId };
    const sort = [{ last_message_at: -1 }];
    const options = { message_limit: 0, limit: 1, state: true };

    const queryChannelsResponse = await Stream.client.queryChannels(
      filter,
      sort,
      options,
    );

    if (!channelId.length) throw new Error('channelId is non-existent');

    const channel = queryChannelsResponse[0];

    message.user_id = user.id;
    message.attributes = JSON.stringify({
      context: 'casual',
      updateId: String(new Date().getTime()),
    });

    const messageCreated = await ChatService.createMessage(message, channel);

    Stream.client.disconnectUser();

    return messageCreated;
  } catch (error) {
    throw error.message;
  }
};

export default sendMessage;
