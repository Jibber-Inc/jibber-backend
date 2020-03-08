import Parse from '../providers/ParseProvider';
import Chat from 'twilio-chat';
import ExtendableError from 'extendable-error-class';
import createChatToken from './createChatToken';


export class CreateChatChannelError extends ExtendableError {}


/**
 * Create a chat channel
 * @param {Parse.User} user
 * @param {String} uniqueName
 * @param {String} friendlyName
 * @param {Boolean} isPrivate
 * @returns {Promise}
 */
const createChatChannel = async (user, uniqueName, friendlyName, isPrivate=false) => {

  if (!Boolean(user instanceof Parse.User)) {
    throw new CreateChatChannelError('[SmQNWk96] user is required');
  }

  if (!uniqueName || typeof uniqueName !== 'string') {
    throw new CreateChatChannelError('[ITLA8RgD] uniqueName is required');
  }

  if (!friendlyName || typeof friendlyName !== 'string') {
    throw new CreateChatChannelError('[VNFMyXuf] friendlyName is required');
  }

  // Make chat client
  const token = createChatToken(user.id);
  return Chat.Client
    .create(token)
    .then(client => {
      // Create and return channel
      return client.createChannel({
        uniqueName,
        friendlyName,
        isPrivate,
      });
    })
    .then(channel => {
      console.log(`[createChatChannel:success] ${JSON.stringify(channel)}`);
      return channel;
    })
    .catch(error => {
      console.error(`[createChatChannel:failure] ${JSON.stringify(error)}`);
      throw error;
    })
  ;
};



export default createChatChannel;
