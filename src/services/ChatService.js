import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
import Twilio from '../providers/TwilioProvider';
// Utils
import MessagesUtil from '../utils/messages';

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

  try {
    const stringAttributes = JSON.stringify(attributes);
    const channel = await new Twilio().client.chat
      .services(SERVICE_ID)
      .channels.create({
        uniqueName,
        friendlyName,
        type,
        attributes: stringAttributes,
        createdBy: owner.id,
        xTwilioWebhookEnabled: true,
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
 * Add Members to a given channel
 *
 * @param {String} channelSid
 * @param {Array<String>} members
 *
 * @returns {Promise}
 */
const addMembersToChannel = async (channelSid, members = []) =>
  members.map(mId =>
    new Twilio().client.chat
      .services(SERVICE_ID)
      .channels(channelSid)
      .members.create({ identity: mId, xTwilioWebhookEnabled: true }),
  );

/**
 * Returns the members of the given channel
 *
 * @param {*} ChannelSid
 *
 * @returns {Array<String>} membersList
 */
const getChannelMembers = async ChannelSid => {
  try {
    const membersList = await new Twilio().client.chat
      .services(process.env.TWILIO_SERVICE_SID)
      .channels(ChannelSid)
      .members.list();
    return membersList;
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Get all user channels
 *
 * @param {String} userId
 */
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

/**
 * Delte a given channel
 *
 * @param {String} channelSid
 */
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

/**
 * Remove the user from Twilio service
 *
 * @param {*} userId
 */
const deleteTwilioUser = async userId => {
  try {
    const twilioUser = await new Twilio().client.chat
      .services(SERVICE_ID)
      .users(userId)
      .fetch();
    if (twilioUser) {
      await new Twilio().client.chat
        .services(SERVICE_ID)
        .users(userId)
        .remove();
    }
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Remove all channels from user
 *
 * @param {String} userId
 */
const deleteUserChannels = async userId => {
  try {
    const userChannels = await getUserChannels(userId);
    await Promise.all(userChannels.map(u => deleteChannel(u.channelSid)));
    return userId;
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Create a message on a given channel.
 *
 * @param { TwilioMessage } message
 * @param { string } ChannelSid
 */
const createMessage = async (message, ChannelSid) => {
  try {
    return new Twilio().client.chat
      .services(SERVICE_ID)
      .channels(ChannelSid)
      .messages.create({ ...message, xTwilioWebhookEnabled: true });
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Fetch a channel by a channel id.
 *
 * @param {string} ChannelSid
 */
const fetchChannel = async ChannelSid => {
  try {
    return new Twilio().client.chat
      .services(SERVICE_ID)
      .channels(ChannelSid)
      .fetch();
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

const createMessagesForChannel = async (channel, data) => {
  const { messages } = MessagesUtil;
  // eslint-disable-next-line no-restricted-syntax
  for await (const message of messages[channel.friendlyName]) {
    const formattedMessage = MessagesUtil.getMessage(message, data);
    const newMessage = {
      body: formattedMessage,
      attributes: JSON.stringify({ context: 'casual' }),
    };
    await createMessage(newMessage, channel.sid);
  }
};

const userHasInitialChannels = async userId => {
  try {
    const channels = await getUserChannels(userId);
    const userChannelsSid = channels.map(channel => channel.channelSid);
    const userChannels = await Promise.all(
      userChannelsSid.map(channelSid => fetchChannel(channelSid)),
    );
    const hasInitialChannels = userChannels.filter(
      channel =>
        channel.friendlyName === 'feedback' ||
        channel.friendlyName === 'welcome',
    );
    return hasInitialChannels.length > 0;
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Creates the initial channels for the new user
 * @param {*} user
 */
const createInitialChannels = async user => {
  // Add to channel members the user
  const members = [user.id];

  // If the desired role exists, add to channel members the admin with that role
  // Get parse role
  const onboardingRole = await new Parse.Query(Parse.Role)
    .equalTo('name', 'ONBOARDING_ADMIN')
    .first();
  if (onboardingRole) {
    // If the role is defined, get the first user with it
    const admin = await onboardingRole.get('users').query().first();
    // If we have users with the desired role, add them to the members
    if (admin) {
      members.push(admin.id);
    }
  }

  // Create the channels
  const welcomeChannel = await createChatChannel(
    user,
    `welcome_${user.id}`,
    'welcome',
    'private',
    { description: 'Start here to learn your way around.' },
  );
  // Send the welcome messages
  await createMessagesForChannel(welcomeChannel, {
    givenName: user.get('givenName'),
  });
  await addMembersToChannel(welcomeChannel.sid, members);

  const feedbackChannel = await createChatChannel(
    user,
    `feedback_${user.id}`,
    'feedback',
    'private',
    { description: 'Got something to say? Say it here!' },
  );
  // Send the feedback message
  await createMessagesForChannel(feedbackChannel);
  await addMembersToChannel(feedbackChannel.sid, members);
};

export default {
  createChatChannel,
  inviteMembers,
  addMembersToChannel,
  getChannelMembers,
  deleteTwilioUser,
  deleteUserChannels,
  createMessage,
  fetchChannel,
  getUserChannels,
  userHasInitialChannels,
  createInitialChannels,
};
