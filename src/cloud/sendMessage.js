// Providers
import Stream from '../providers/StreamProvider';
// Services
import ChatService from '../services/MessagingService';

/**
 * Send a Chat message
 * @param {Object} request
 */
const sendMessage = async request => {
  const { params, user } = request;
  const { channelId, message } = params;

  if (!user) throw new Error('A logged user is required');
  if (!channelId) throw new Error('A channelId is required');
  // if (!message || !message.text) throw new Error('A message.text is required');

  try {
    // Fetch channel
    const filter = { id: { $eq: channelId } };
    const sort = [{ last_message_at: -1 }];

    const channels = await Stream.client.queryChannels(filter, sort, {
      watch: false, // this is the default 
      state: true,
    });

    return channels;
  } catch (error) {
    return error;
  }
};

export default sendMessage;
