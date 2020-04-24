import Parse from '../providers/ParseProvider';
const Chat = require('twilio-chat');
import ExtendableError from 'extendable-error-class';
import createChatToken from './createChatTokenService';

export class CreateChatChannelError extends ExtendableError {}

/**
 * Create a chat channel
 * @param {Parse.User} user
 * @param {String} uniqueName
 * @param {String} friendlyName
 * @param {Boolean} isPrivate
 * @returns {Promise}
 */
const createChatChannelService = async (
  user,
  uniqueName,
  friendlyName,
  isPrivate = false,
) => {
  if (!Boolean(user instanceof Parse.User)) {
    throw new CreateChatChannelError('[SmQNWk96] user is required');
  }

  if (!uniqueName || typeof uniqueName !== 'string') {
    throw new CreateChatChannelError('[ITLA8RgD] uniqueName is required');
  }

  if (!friendlyName || typeof friendlyName !== 'string') {
    throw new CreateChatChannelError('[VNFMyXuf] friendlyName is required');
  }

  // @todo - Placeholder until we figure out how to mock the twilio chat client
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  // Make chat client
  const token = createChatToken(user.id);
  return Chat.Client.create(token)
    .then(client => {
      // Create and return channel
      return client.createChannel({
        uniqueName,
        friendlyName,
        isPrivate,
      });
    })
    .then(channel => {
      console.log(
        `[createChatChannelService:success] ${JSON.stringify(channel)}`,
      );
      return channel;
    })
    .catch(error => {
      console.error(
        `[createChatChannelService:failure] ${JSON.stringify(error)}`,
      );
      throw error;
    });
};

export default createChatChannelService;
