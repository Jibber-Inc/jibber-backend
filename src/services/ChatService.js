import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
import Twilio from '../providers/TwilioProvider';
import Stream from '../providers/StreamProvider';
// Utils
import MessagesUtil from '../utils/messages';
// Constants
import { ONBOARDING_ADMIN, MESSAGE } from '../constants/index';
import UserService from './UserService';

export class ChatServiceError extends ExtendableError {}

const SERVICE_ID = process.env.TWILIO_SERVICE_SID;

/**
 * Create a conversation
 * @param {Parse.User} owner
 * @param {String} uniqueName
 * @param {String} friendlyName
 * @param {Boolean} isPrivate
 * @param {Object} attributes
 * @returns {Promise}
 */
const createConversation = async (
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
    const conversation = await new Twilio().client.chat
      .services(SERVICE_ID)
      .channels.create({
        uniqueName,
        friendlyName,
        type,
        attributes: stringAttributes,
        createdBy: owner.id,
        xTwilioWebhookEnabled: true,
      });
    return conversation;
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Invite Members to a given conversation
 *
 * @param {String} conversationSid
 * @param {Array<String>} members
 *
 * @returns {Promise}
 */
const inviteMembers = async (conversationSid, members = []) => {
  try {
    return members.map(mId =>
      new Twilio().client.chat
        .services(SERVICE_ID)
        .channels(conversationSid)
        .invites.create({ identity: mId }),
    );
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Add Members to a given conversation
 *
 * @param {String} conversationSid
 * @param {Array<String>} members
 *
 * @returns {Promise}
 */
const addMembersToConversation = async (conversationSid, members = []) =>
  members.map(mId =>
    new Twilio().client.chat
      .services(SERVICE_ID)
      .channels(conversationSid)
      .members.create({ identity: mId, xTwilioWebhookEnabled: true }),
  );

/**
 * Returns the members of the given conversation
 *
 * @param {*} ConversationSid
 *
 * @returns {Array<String>} membersList
 */
const getConversationMembers = async ConversationSid => {
  try {
    const membersList = await new Twilio().client.chat
      .services(process.env.TWILIO_SERVICE_SID)
      .channels(ConversationSid)
      .members.list();
    return membersList;
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Get all user conversations
 *
 * @param {String} userId
 */
const getUserConversations = async userId => {
  try {
    const filter = { members: { $in: [userId] } };
    const userConversations = await Stream.client.queryChannels(filter, {}, {});

    return userConversations;
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Delte a given conversation
 *
 * @param {String} conversationSid
 */
const deleteConversation = async conversationSid => {
  try {
    return new Twilio().client.chat
      .services(SERVICE_ID)
      .channels(conversationSid)
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
 * Remove all conversations from user
 *
 * @param {String} userId
 */
const deleteUserConversations = async userId => {
  try {
    const userConversations = await getUserConversations(userId);
    await Promise.all(userConversations.map(u => deleteConversation(u.conversationSid)));
    return userId;
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Create a message on a given conversation.
 *
 * @param {Object} message
 * @param {StreamConversation} conversation
 */
const createMessage = async (message, conversation) => {
  try {
    return await conversation.sendMessage(message);
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Fetch a conversation by a conversation id.
 *
 * @param {String} ConversationSid
 */
const fetchConversation = async ConversationSid => {
  try {
    return new Twilio().client.chat
      .services(SERVICE_ID)
      .channels(ConversationSid)
      .fetch();
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 * Fetch a message by a message id.
 *
 * @param {String} ConversationSid
 */
const fetchMessage = async MessageSid => {
  try {
    return new Twilio().client.messages(MessageSid).fetch();
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

/**
 *
 * @param {StreamConversation} conversationInstance
 * @param {StreamConversation} conversationConfig
 * @param {String} senderId
 * @param {Object} data
 */
const createMessagesForConversation = async (
  { conversation },
  conversationConfig,
  senderId,
  data = {},
) => {
  const { messages } = MessagesUtil;
  // eslint-disable-next-line no-restricted-syntax
  for await (const message of messages[conversation.name]) {
    const formattedMessage = MessagesUtil.getMessage(message, data);
    const newMessage = {
      text: formattedMessage,
      user_id: senderId,
      context: MESSAGE.CONTEXT.PASSIVE,
    };
    await createMessage(newMessage, conversationConfig);
  }
};

/**
 * Creates the initial conversations for the new user
 * @param {*} user
 */
const createInitialConversations = async user => {
  // Add to conversation members the user
  const members = [user.id];
  let admin;

  // If the desired role exists, add to conversation members the admin with that role
  // Get parse role
  const onboardingRole = await new Parse.Query(Parse.Role)
    .equalTo('name', ONBOARDING_ADMIN)
    .first();

  if (onboardingRole) {
    // If the role is defined, get the first user with it
    admin = await onboardingRole.get('users').query().first();
    // If we have users with the desired role, add them to the members
    if (admin) {
      members.push(admin.id);

      await UserService.connectUser(admin);

      const welcomeConversationConfig = Stream.client.channel(
        'messaging',
        `welcome_${user.id}`,
        {
          name: 'welcome',
          description: 'Start here to learn your way around.',
          members,
          created_by_id: admin.id,
        },
      );

      const welcomeConversationInstance = await welcomeConversationConfig.create();

      // Send the welcome messages
      await createMessagesForConversation(
        welcomeConversationInstance,
        welcomeConversationConfig,
        admin.id,
        {
          givenName: user.get('givenName'),
        },
      );

      await Stream.client.disconnectUser();
    }
  }
};

export default {
  createConversation,
  inviteMembers,
  addMembersToConversation,
  getConversationMembers,
  deleteTwilioUser,
  deleteUserConversations,
  createMessage,
  fetchConversation,
  fetchMessage,
  getUserConversations,
  createInitialConversations,
  createMessagesForConversation,
};
