import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
import Twilio from '../providers/TwilioProvider';
import Stream from '../providers/StreamProvider';
// Constants
import { ONBOARDING_ADMIN, MESSAGE } from '../constants/index';
import UserService from './UserService';
// Utils
import MessagesUtil from '../utils/messages';

// Load Environment Variables
const { BENJI_PHONE_NUMBER } = process.env;

export class ChatServiceError extends ExtendableError { }

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
const createConversation = async (owner, conversationId, type = 'messaging', title = '', members = []) => {
  if (!owner) {
    throw new ChatServiceError('[SmQNWk96] owner is required');
  }

  if (!conversationId || typeof conversationId !== 'string') {
    throw new ChatServiceError('[ITLA8RgD] conversationId is required');
  }

  if (!members.length) {
    members.push(owner.id || owner);
  }

  try {
    const conversationConfig = Stream.client.conversation(
      type,
      conversationId,
      {
        title,
        name: title,
        description: '',
        members,
        created_by_id: owner.id || owner,
      },
    );

    const conversation = await conversationConfig.create();
    return conversation;
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
 * Remove all conversations from user
 *
 * @param {String} userId
 */
const deleteUserConversations = async userId => {
  try {
    const userConversations = await getUserConversations(userId);
    await Promise.all(
      userConversations.map(u => deleteConversation(u.conversationSid)),
    );
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
    }
  }
};

/**
 * 
 * @param {*} conversationCid 
 * @returns 
 */
const getConversationByCid = async (conversationCid) => {
  const filter = { cid: { $eq: conversationCid } };
  const sort = [{ last_message_at: -1 }];
  const options = { message_limit: 0, limit: 1, state: true };
  const conversationsResponse = await Stream.client.queryConversations(
    filter,
    sort,
    options,
  );
  if (!conversationsResponse.length)
    throw new Error("There's no conversation with the given conversation ID");

  return conversationsResponse[0];
};

/**
 * 
 * @param {*} conversationCid 
 * @returns 
 */
const existsConversationByCid = async (conversationCid) => {
  const filter = { cid: { $eq: conversationCid } };
  const sort = [{ last_message_at: -1 }];
  const options = { message_limit: 0, limit: 1, state: true };
  const conversationsResponse = await Stream.client.queryConversations(
    filter,
    sort,
    options,
  );
  return conversationsResponse;
};

/**
 * 
 * @param {*} conversation 
 * @param {*} members 
 */
const addMemberToConversation = async (conversation, members) => {
  await conversation.addMembers(members);
};

/**
 * Deletes an user in Stream
 * 
 * @param {*} userId 
 * @returns 
 */
const deleteWaitlistConversation = async (userId) => {
  const conversationCid = `messaging:${userId}_waitlist_conversation`;
  const conversation = await getConversationByCid(conversationCid)
  const deletedConversation = await conversation.delete();

  return deletedConversation;
};

/**
 * Deletes an user in Stream
 * 
 * @param {*} userId 
 * @returns 
 */
const deleteUser = async (userId) => {
  await deleteWaitlistConversation(userId);
  const deletedUser = await Stream.client.deleteUser(userId, {
    mark_messages_deleted: false,
  });
  return deletedUser;
};

/**
 * set new reaction to message
 * @param {Channel} conversation
 * @param {String} messageId
 * @param {String} reactionType
 * @param {String} userId
 */
const sendReactionToMessage = async (conversation, messageId, reactionType, userId) => {
  try {
    const reaction = await conversation.sendReaction(messageId, {
      type: reactionType,
      user_id: userId,
    });

    return reaction;
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};


/**
 * Creates the waitlist conversation for the given user
 * 
 * @param {*} user 
 */
const createWaitlistConversation = async (user) => {

  const hasWaitListConversation = await existsConversationByCid(
    `messaging:${user.id}_waitlist_conversation`,
  );

  if (!hasWaitListConversation.length) {
    // TODO: Uncomment this when the app (frontend) is ready to use it.
    // await ChatService.createConversation(
    //   user,
    //   `${user.id}_invitation_conversation_${new Date().getTime()}`,
    //   'invitation'
    // );

    // Retrieve the user with the phoneNumber
    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('phoneNumber', BENJI_PHONE_NUMBER);

    const admin = await userQuery.first({ useMasterKey: true });

    await createConversation(
      user,
      `${user.id}_waitlist_conversation`,
      'messaging',
      'Benji, Co-Founder',
      [admin.id, user.id],
    );
    const conversation = await getConversationByCid(
      `messaging:${user.id}_waitlist_conversation`,
    );

    if (conversation) {
      const { waitlistMessages } = MessagesUtil;

      await Promise.all(
        waitlistMessages.map(message => {
          const formattedMessage = MessagesUtil.getMessage(message, {
            givenName: user.get('givenName'),
          });
          const newMessage = {
            text: formattedMessage,
            user_id: admin.id
          };
          return createMessage(newMessage, conversation);
        }),
      );
    }
  }
};

export default {
  createConversation,
  deleteUser,
  deleteUserConversations,
  createMessage,
  getUserConversations,
  createInitialConversations,
  createMessagesForConversation,
  addMemberToConversation,
  getConversationByCid,
  sendReactionToMessage,
  existsConversationByCid,
  deleteWaitlistConversation,
  createWaitlistConversation
};
