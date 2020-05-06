import ExtendableError from 'extendable-error-class';
import Twilio from '../providers/TwilioProvider';

export class ChatServiceError extends ExtendableError {}

const SERVICE_ID = process.env.TWILIO_SERVICE_SID;

/**
 * Create a chat channel
 * @param {Parse.User} owner
 * @param {String} uniqueName
 * @param {String} friendlyName
 * @param {Boolean} isPrivate
 * @param {Object} attributes
 * @returns {Promise}
 */
const createChatChannel = async (
  owner,
  uniqueName,
  friendlyName,
  type = 'private',
  attributes = {},
) => {
  if (!owner) {
    throw new ChatServiceError('[SmQNWk96] owner is required');
  }

  if (!uniqueName || typeof uniqueName !== 'string') {
    throw new ChatServiceError('[ITLA8RgD] uniqueName is required');
  }

  if (!friendlyName || typeof friendlyName !== 'string') {
    throw new ChatServiceError('[VNFMyXuf] friendlyName is required');
  }
  try {
    const channel = await new Twilio().client.chat
      .services(SERVICE_ID)
      .channels.create({
        uniqueName,
        friendlyName,
        type,
        attributes,
        createdBy: owner.id,
      });
    return channel;
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Invite Members to a given channel
 *
 * @param {String} channelSid
 * @param {Array<String>} members
 *
 * @returns {Promise}
 */
const inviteMembers = async (channelSid, members = []) => {
  try {
    return members.map(mId =>
      new Twilio().client.chat
        .services(SERVICE_ID)
        .channels(channelSid)
        .invites.create({ identity: mId }),
    );
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Invite Members to a given channel
 *
 * @param {String} channelSid
 * @param {Array<String>} members
 *
 * @returns {Promise}
 */
const addMembersToChannel = async (channelSid, members = []) => {
  return members.map(mId =>
    new Twilio().client.chat
      .services(SERVICE_ID)
      .channels(channelSid)
      .members.create({ identity: mId }),
  );
};

const deleteUser = async userId => {
  try {
    const userChannels = await getUserChannels(userId);
    await Promise.all(userChannels.map(u => deleteChannel(u.channelSid)));
    await new Twilio().client.chat.services(SERVICE_ID).users(userId).remove();
    return userId;
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

const getUserChannels = async userId => {
  try {
    const userChannels = await new Twilio().client.chat
      .services(SERVICE_ID)
      .users(userId)
      .userChannels.list({ limit: 50 });
    return userChannels;
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

const deleteChannel = async channelSid => {
  try {
    return new Twilio().client.chat
      .services(SERVICE_ID)
      .channels(channelSid)
      .remove();
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

export default {
  createChatChannel,
  inviteMembers,
  addMembersToChannel,
  deleteUser,
};
