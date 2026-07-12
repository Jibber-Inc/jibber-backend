import crypto from 'crypto';
import ExtendableError from 'extendable-error-class';
import { v4 as uuidv4 } from 'uuid';
import Parse from '../providers/ParseProvider';
import { ONBOARDING_ADMIN } from '../constants/index';
import {
  CONVERSATION_TYPES,
  MESSAGE_DELIVERY_TYPES,
  MESSAGING_CLASSES,
} from '../constants/messaging';
import {
  addConversationMembers,
  addReaction,
  createConversation as createParseConversation,
  deactivateUserMemberships,
  getObjectId,
  sendMessage,
} from './ParseMessagingService';
import MessagesUtil from '../utils/messages';

export class ChatServiceError extends ExtendableError {}

const masterOptions = { useMasterKey: true };

const resolveUser = async user => {
  const userId = getObjectId(user);
  if (!userId) throw new ChatServiceError('A user is required.');
  if (user instanceof Parse.User) return user;
  return new Parse.Query(Parse.User).get(userId, masterOptions);
};

const digestIdentifier = value =>
  crypto.createHash('sha256').update(value).digest('hex');

const makeClientConversationId = conversationId =>
  /^[A-Za-z0-9._:-]{8,128}$/.test(conversationId)
    ? conversationId
    : `legacy:${digestIdentifier(conversationId)}`;

const makeContextKey = conversationId => {
  const candidate = `legacy:${conversationId}`;
  return /^[A-Za-z0-9._:-]{3,256}$/.test(candidate)
    ? candidate
    : `legacy:${digestIdentifier(conversationId)}`;
};

const normalizeConversationType = (type, memberCount) => {
  if (CONVERSATION_TYPES.indexOf(type) !== -1) return type;
  return memberCount > 2 ? 'group' : 'direct';
};

const normalizeDeliveryType = value => {
  if (MESSAGE_DELIVERY_TYPES.indexOf(value) !== -1) return value;
  const mappings = {
    active: 'conversational',
    passive: 'respectful',
    quiet: 'respectful',
    timeSensitive: 'time-sensitive',
    urgent: 'time-sensitive',
  };
  return mappings[value] || 'respectful';
};

const legacyIdentifierCandidates = conversationCid => {
  const identifier = String(conversationCid);
  const unqualified = identifier.includes(':')
    ? identifier.slice(identifier.indexOf(':') + 1)
    : identifier;
  const identifiers = Array.from(new Set([identifier, unqualified]));
  return {
    clientIds: Array.from(
      new Set(identifiers.map(makeClientConversationId)),
    ),
    contextKeys: Array.from(new Set(identifiers.map(makeContextKey))),
    objectIds: identifiers,
  };
};

const findConversationByCid = async conversationCid => {
  if (!conversationCid) return undefined;
  if (
    conversationCid instanceof Parse.Object &&
    conversationCid.className === MESSAGING_CLASSES.CONVERSATION
  ) {
    return conversationCid;
  }

  const candidates = legacyIdentifierCandidates(conversationCid);
  // Parse object IDs are the canonical identifier after the cutover. Legacy
  // client/context keys remain a compatibility lookup for reachable workflows.
  // eslint-disable-next-line no-restricted-syntax
  for (const objectId of candidates.objectIds) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await new Parse.Query(MESSAGING_CLASSES.CONVERSATION).get(
        objectId,
        masterOptions,
      );
    } catch (error) {
      if (error.code !== Parse.Error.OBJECT_NOT_FOUND) throw error;
    }
  }

  const clientIdQuery = new Parse.Query(MESSAGING_CLASSES.CONVERSATION)
    .containedIn('clientConversationId', candidates.clientIds);
  const contextKeyQuery = new Parse.Query(MESSAGING_CLASSES.CONVERSATION)
    .containedIn('contextKey', candidates.contextKeys);
  return Parse.Query.or(clientIdQuery, contextKeyQuery).first(masterOptions);
};

/**
 * Creates a Parse-native conversation. The function name remains as a narrow
 * compatibility boundary for onboarding, pass, reservation, and connection
 * workflows that predate the Parse messaging service.
 */
const createConversation = async (
  owner,
  conversationId,
  type = 'direct',
  title = '',
  members = [],
  options = {},
) => {
  if (!owner) throw new ChatServiceError('[SmQNWk96] owner is required');
  if (!conversationId || typeof conversationId !== 'string') {
    throw new ChatServiceError('[ITLA8RgD] conversationId is required');
  }

  try {
    const creator = await resolveUser(owner);
    const memberIds = Array.from(
      new Set([creator.id].concat(members.map(getObjectId)).filter(Boolean)),
    );
    const trustedContextKey = options.trustedLegacyContextKey
      ? makeContextKey(conversationId)
      : undefined;
    return await createParseConversation(
      creator,
      {
        clientConversationId: makeClientConversationId(conversationId),
        contextKey: trustedContextKey,
        memberIds,
        title,
        type: normalizeConversationType(type, memberIds.length),
      },
      { trustedContextKey: Boolean(trustedContextKey) },
    );
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

const getConversationByCid = async conversationCid => {
  const conversation = await findConversationByCid(conversationCid);
  if (!conversation) {
    throw new ChatServiceError(
      "There's no conversation with the given conversation ID",
    );
  }
  return conversation;
};

const existsConversationByCid = async conversationCid => {
  const conversation = await findConversationByCid(conversationCid);
  return conversation ? [conversation] : [];
};

const getUserConversations = async userId => {
  try {
    const user = await resolveUser(userId);
    const memberships = await new Parse.Query(MESSAGING_CLASSES.MEMBER)
      .equalTo('user', user)
      .equalTo('active', true)
      .include('conversation')
      .limit(1000)
      .find(masterOptions);
    return memberships.map(membership => membership.get('conversation'));
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

const deleteConversation = async conversationCid => {
  try {
    const conversation = await getConversationByCid(conversationCid);
    conversation.set('isDeleted', true);
    return conversation.save(null, masterOptions);
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

const deleteUserConversations = async userId => {
  try {
    await deactivateUserMemberships(userId);
    return userId;
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

const createMessage = async (message, conversationReference) => {
  try {
    const conversation = await getConversationByCid(conversationReference);
    const author = await resolveUser(
      message.user_id || message.authorId || message.user,
    );
    return sendMessage(author, {
      attachments: Array.isArray(message.attachments)
        ? message.attachments
        : [],
      clientCreatedAt: message.clientCreatedAt || new Date(),
      clientMessageId:
        message.clientMessageId || message.id || `legacy-message:${uuidv4()}`,
      contentType: message.contentType || 'text',
      conversationId: conversation.id,
      deliveryType: normalizeDeliveryType(
        message.deliveryType || message.context,
      ),
      expressions: message.expressions || [],
      linkURL: message.linkURL,
      metadata: message.metadata || {},
      replyToId: message.replyToId,
      text: message.text || '',
    });
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

const createMessagesForConversation = async (
  conversationInstance,
  conversationReference,
  senderId,
  data = {},
) => {
  const conversation = await getConversationByCid(
    conversationReference || conversationInstance,
  );
  const messages = MessagesUtil.welcomeMessages.reduce(
    (allMessages, pair) => allMessages.concat(pair),
    [],
  );
  await messages.reduce(
    (previous, template, index) =>
      previous.then(() =>
        createMessage(
          {
            clientMessageId: `welcome:${conversation.id}:${index}`,
            context: 'passive',
            text: MessagesUtil.getMessage(template, data),
            user_id: senderId,
          },
          conversation,
        ),
      ),
    Promise.resolve(),
  );
  return conversation;
};

const createInitialConversations = async user => {
  const onboardingRole = await new Parse.Query(Parse.Role)
    .equalTo('name', ONBOARDING_ADMIN)
    .first(masterOptions);
  if (!onboardingRole) return undefined;

  const admin = await onboardingRole
    .get('users')
    .query()
    .first(masterOptions);
  if (!admin) return undefined;

  const conversation = await createConversation(
    admin,
    `welcome_${user.id}`,
    'welcome',
    'welcome',
    [admin.id, user.id],
    { trustedLegacyContextKey: true },
  );
  await createMessagesForConversation(
    conversation,
    conversation,
    admin.id,
    { givenName: user.get('givenName') },
  );
  return conversation;
};

const addMemberToConversation = async (conversationReference, members) => {
  try {
    const conversation = await getConversationByCid(conversationReference);
    return addConversationMembers(conversation.get('creator'), {
      conversationId: conversation.id,
      memberIds: members,
    });
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

const deleteUser = async userId => {
  await deactivateUserMemberships(userId);
  return userId;
};

const sendReactionToMessage = async (
  conversationReference,
  messageId,
  reactionType,
  userId,
) => {
  try {
    const [conversation, user, message] = await Promise.all([
      getConversationByCid(conversationReference),
      resolveUser(userId),
      new Parse.Query(MESSAGING_CLASSES.MESSAGE).get(messageId, masterOptions),
    ]);
    if (getObjectId(message.get('conversation')) !== conversation.id) {
      throw new ChatServiceError(
        'The message does not belong to the supplied conversation.',
      );
    }
    return addReaction(user, { messageId, type: reactionType });
  } catch (error) {
    throw new ChatServiceError(error.message);
  }
};

export default {
  addMemberToConversation,
  createConversation,
  createInitialConversations,
  createMessage,
  createMessagesForConversation,
  deleteConversation,
  deleteUser,
  deleteUserConversations,
  existsConversationByCid,
  getConversationByCid,
  getUserConversations,
  sendReactionToMessage,
};
