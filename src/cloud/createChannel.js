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
const createChannel = async request => {
  const { user, params } = request;
  const { uniqueName, friendlyName, context, type, members } = params;
  try {
    if (!user) throw new CreateChannelError('User need to be authenticated.');
    // create channel
    const channel = await ChatService.createChatChannel(
      user,
      uniqueName,
      friendlyName,
      type,
      { context },
    );

    // add request user to member list
    await ChatService.addMembersToChannel(channel.sid, [user.id]);
    // send invites to members
    await ChatService.inviteMembers(channel.sid, members);
    return {
      channel: channel.sid,
    };
  } catch (error) {
    throw new CreateChannelError(error.message);
  }
};

export default createChannel;
