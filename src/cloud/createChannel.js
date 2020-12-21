// Vendor
import ExtendableError from 'extendable-error-class';

// Services
import ChatService from '../services/ChatService';

export class CreateChannelError extends ExtendableError {}

/**
 * Create a connection
 * @param {*} request
 * @param {*} response
 */
const createChannel = async (request) => {
  const { user, params } = request;
  const {
    uniqueName, friendlyName, type, members, attributes,
  } = params;
  try {
    if (!user) throw new CreateChannelError('User need to be authenticated.');
    // create channel
    const channel = await ChatService.createChatChannel(
      user,
      uniqueName,
      friendlyName,
      type,
      attributes,
    );

    // add request user and members to member channel list
    await ChatService.addMembersToChannel(channel.sid, [user.id, ...members]);

    return {
      channel: channel.sid,
    };
  } catch (error) {
    throw new CreateChannelError(error.message);
  }
};

export default createChannel;
