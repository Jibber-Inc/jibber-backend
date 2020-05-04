import ExtendableError from 'extendable-error-class';
const Chat = require('twilio-chat');
const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;

export class ChatServiceError extends ExtendableError {}

/**
 * createChatToken utility function
 * @param {String} userId
 * @return {String} Jason Web Token
 */
const createChatToken = userId => {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    TWILIO_SERVICE_SID,
  } = process.env;

  if (!TWILIO_ACCOUNT_SID) {
    throw new ChatServiceError('[Hr5B+AnF] expected TWILIO_ACCOUNT_SID');
  }
  if (!TWILIO_API_KEY) {
    throw new ChatServiceError('[Ot/hJQ6Q] expected TWILIO_API_KEY');
  }
  if (!TWILIO_API_SECRET) {
    throw new ChatServiceError('[oa55glNj] expected TWILIO_API_SECRET');
  }
  if (!TWILIO_SERVICE_SID) {
    throw new ChatServiceError('[DWLPvwsL] expected TWILIO_SERVICE_SID');
  }
  if (!userId || typeof userId !== 'string') {
    throw new ChatServiceError('[KV2wmxfD] expected userId');
  }

  const accessToken = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
  );
  const chatGrant = new ChatGrant({
    serviceSid: TWILIO_SERVICE_SID,
  });
  accessToken.addGrant(chatGrant);
  accessToken.identity = userId;
  return accessToken.toJwt();
};

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
  isPrivate = false,
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

  // Make chat client
  const token = createChatToken(owner.id);

  try {
    const client = await Chat.Client.create(token);
    return client.createChannel({
      uniqueName,
      friendlyName,
      isPrivate,
      attributes,
    });
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Invite Members to a given channel
 *
 * @param {Twilio.Channel.uniqueName} uniqueName
 * @param {Array<String>} members
 *
 * @returns {Promise}
 */
const inviteMembers = async (uniqueName, members = []) => {
  try {
    const channel = await Chat.Client.getChannelByUniqueName(uniqueName);
    await Promise.all(members.map(mId => channel.invite(mId)));
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

export default {
  createChatChannel,
  inviteMembers,
};
