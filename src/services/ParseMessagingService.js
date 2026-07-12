import ExtendableError from 'extendable-error-class';
import { isURL } from 'validator';
import Parse from '../providers/ParseProvider';
import PushService from './PushService';
import UserUtils from '../utils/userData';
import MessagingMetricsService from './MessagingMetricsService';
import {
  CONVERSATION_TYPES,
  CONVERSATION_MEMBER_ROLES,
  MESSAGE_ATTACHMENT_KINDS,
  MESSAGE_CONTENT_TYPES,
  MESSAGE_DELIVERY_TYPES,
  MESSAGE_RECEIPT_STATES,
  MESSAGING_CLASSES,
  MESSAGING_LIMITS,
  MESSAGING_SCHEMA_VERSION,
} from '../constants/messaging';

export class ParseMessagingServiceError extends ExtendableError {}

const masterOptions = { useMasterKey: true };
const accessFields = ['active', 'conversation', 'leftAt', 'role', 'user'];

const isTrustedInternalWrite = request =>
  request.master &&
  request.context &&
  (request.context.messagingACLPropagation ||
    request.context.messagingDerivedState ||
    request.context.messagingTrustedWrite);

const throwServiceError = message => {
  throw new ParseMessagingServiceError(message);
};

export const getObjectId = value => {
  if (!value) return undefined;
  return value.id || value.objectId || value;
};

const createPointer = (className, objectId) => {
  const pointer = new Parse.Object(className);
  pointer.id = objectId;
  return pointer;
};

export const isNewRequest = request => !request.original;

export const getDirtyKeys = request => {
  if (!request || !request.object || !request.object.dirtyKeys) return [];
  return request.object.dirtyKeys();
};

const hasChanged = (request, field) => {
  if (!request.original) return request.object.get(field) !== undefined;
  const dirtyKeys = getDirtyKeys(request);
  if (dirtyKeys.length) return dirtyKeys.indexOf(field) !== -1;
  return request.object.get(field) !== request.original.get(field);
};

const pointerChanged = (request, field) => {
  if (!request.original) return false;
  return (
    getObjectId(request.object.get(field)) !==
    getObjectId(request.original.get(field))
  );
};

const assertAllowedFields = (request, allowedFields) => {
  if (request.master) return;
  const rejectedFields = getDirtyKeys(request).filter(
    field => allowedFields.indexOf(field) === -1,
  );

  if (rejectedFields.length) {
    throwServiceError(
      `Messaging write contains protected fields: ${rejectedFields.join(', ')}`,
    );
  }
};

const requireUser = request => {
  if (!request.user && !request.master) {
    throwServiceError('Authentication is required for messaging writes.');
  }
  return request.user;
};

const requirePointer = (object, field) => {
  const pointer = object.get(field);
  if (!getObjectId(pointer)) {
    throwServiceError(`${field} is required.`);
  }
  return pointer;
};

const requireString = (value, field, maximumLength, allowEmpty = false) => {
  if (typeof value !== 'string') {
    throwServiceError(`${field} must be a string.`);
  }
  if (!allowEmpty && !value.trim()) {
    throwServiceError(`${field} cannot be empty.`);
  }
  if (value.length > maximumLength) {
    throwServiceError(`${field} exceeds the ${maximumLength} character limit.`);
  }
};

const requireEnum = (value, field, allowedValues) => {
  if (allowedValues.indexOf(value) === -1) {
    throwServiceError(`${field} has an unsupported value.`);
  }
};

const validateClientMessageId = clientMessageId => {
  requireString(
    clientMessageId,
    'clientMessageId',
    MESSAGING_LIMITS.MAX_CLIENT_MESSAGE_ID_LENGTH,
  );
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(clientMessageId)) {
    throwServiceError('clientMessageId has an invalid format.');
  }
};

const validateClientConversationId = clientConversationId => {
  if (clientConversationId === undefined || clientConversationId === null) {
    return;
  }
  requireString(
    clientConversationId,
    'clientConversationId',
    MESSAGING_LIMITS.MAX_CLIENT_CONVERSATION_ID_LENGTH,
  );
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(clientConversationId)) {
    throwServiceError('clientConversationId has an invalid format.');
  }
};

const validateContextKey = contextKey => {
  if (contextKey === undefined || contextKey === null) return;
  requireString(
    contextKey,
    'contextKey',
    MESSAGING_LIMITS.MAX_CONTEXT_KEY_LENGTH,
  );
  if (!/^[A-Za-z0-9._:-]{3,256}$/.test(contextKey)) {
    throwServiceError('contextKey has an invalid format.');
  }
};

const getMomentIdFromContextKey = contextKey => {
  const match =
    typeof contextKey === 'string' &&
    contextKey.match(/^moment:([A-Za-z0-9_-]+)$/);
  if (!match) {
    throwServiceError(
      'contextKey must use the canonical moment:<Moment.objectId> format.',
    );
  }
  return match[1];
};

const getMomentForContextKey = async contextKey => {
  const momentId = getMomentIdFromContextKey(contextKey);
  try {
    return await new Parse.Query('Moment').get(momentId, masterOptions);
  } catch (error) {
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throwServiceError('contextKey must reference an existing Moment.');
    }
    throw error;
  }
};

const assertMomentContextAuthority = async (
  user,
  params,
  options = {},
) => {
  if (!params.contextKey) return undefined;
  if (options.trustedContextKey) return undefined;
  if (params.type !== 'moment') {
    throwServiceError('A Moment contextKey requires conversation type moment.');
  }
  const moment = await getMomentForContextKey(params.contextKey);
  if (getObjectId(moment.get('author')) !== getObjectId(user)) {
    throwServiceError('Only the Moment author may claim its contextKey.');
  }
  return moment;
};

const isDuplicateKeyError = error =>
  error && (error.code === 137 || /duplicate key/i.test(error.message));

const validateHttpURL = (value, field = 'linkURL') => {
  requireString(value, field, MESSAGING_LIMITS.MAX_LINK_URL_LENGTH);
  if (
    !isURL(value, {
      protocols: ['http', 'https'],
      require_protocol: true,
    })
  ) {
    throwServiceError(`${field} must be a valid HTTP or HTTPS URL.`);
  }
};

const expressionKey = expression =>
  `${expression.authorId}:${expression.expressionId}`;

const validateExpressions = (request, actor) => {
  if (!hasChanged(request, 'expressions')) return;
  const expressions = request.object.get('expressions') || [];
  if (!Array.isArray(expressions)) {
    throwServiceError('expressions must be an array.');
  }
  if (expressions.length > MESSAGING_LIMITS.MAX_EXPRESSIONS) {
    throwServiceError(
      `expressions may contain at most ${MESSAGING_LIMITS.MAX_EXPRESSIONS} references.`,
    );
  }

  const keys = new Set();
  expressions.forEach(expression => {
    if (!expression || typeof expression !== 'object') {
      throwServiceError('Each expression reference must be an object.');
    }
    const fields = Object.keys(expression).sort();
    if (fields.join(',') !== 'authorId,expressionId') {
      throwServiceError(
        'Expression references may contain only authorId and expressionId.',
      );
    }
    requireString(expression.authorId, 'expression.authorId', 128);
    requireString(
      expression.expressionId,
      'expression.expressionId',
      MESSAGING_LIMITS.MAX_EXPRESSION_ID_LENGTH,
    );
    const key = expressionKey(expression);
    if (keys.has(key)) {
      throwServiceError('Duplicate expression references are not allowed.');
    }
    keys.add(key);
  });

  const previousExpressions = request.original
    ? request.original.get('expressions') || []
    : [];
  previousExpressions.forEach(expression => {
    if (!keys.has(expressionKey(expression))) {
      throwServiceError('Existing expression references cannot be removed or edited.');
    }
  });

  if (!request.master) {
    const previousKeys = new Set(previousExpressions.map(expressionKey));
    expressions
      .filter(expression => !previousKeys.has(expressionKey(expression)))
      .forEach(expression => {
        if (expression.authorId !== getObjectId(actor)) {
          throwServiceError('Expression authorId must match the authenticated user.');
        }
      });
  }
};

const validateAttachments = attachments => {
  if (attachments === undefined) return;
  if (!Array.isArray(attachments)) {
    throwServiceError('attachments must be an array.');
  }
  if (attachments.length > MESSAGING_LIMITS.MAX_ATTACHMENTS) {
    throwServiceError(
      `A message may contain at most ${MESSAGING_LIMITS.MAX_ATTACHMENTS} attachments.`,
    );
  }

  attachments.forEach(attachment => {
    if (!attachment || typeof attachment !== 'object') {
      throwServiceError('Each attachment must be an object.');
    }
    requireEnum(attachment.kind, 'attachment.kind', MESSAGE_ATTACHMENT_KINDS);
    if (attachment.kind === 'linkPreview') {
      validateHttpURL(attachment.linkURL, 'attachment.linkURL');
    } else if (
      !attachment.file ||
      !(attachment.file instanceof Parse.File)
    ) {
      throwServiceError('Each attachment must reference a ParseFile.');
    }
    if (
      attachment.byteCount !== undefined &&
      (!Number.isFinite(attachment.byteCount) ||
        attachment.byteCount < 0 ||
        attachment.byteCount > MESSAGING_LIMITS.MAX_ATTACHMENT_BYTES)
    ) {
      throwServiceError('Attachment byteCount is invalid or exceeds the limit.');
    }
  });
};

const validateMessageContent = message => {
  const contentType = message.get('contentType') || 'text';
  const text = message.get('text') || '';
  const attachments = message.get('attachments') || [];
  const expressions = message.get('expressions') || [];
  const linkURL = message.get('linkURL');

  requireEnum(contentType, 'contentType', MESSAGE_CONTENT_TYPES);
  requireString(
    text,
    'text',
    MESSAGING_LIMITS.MAX_MESSAGE_TEXT_LENGTH,
    true,
  );
  validateAttachments(attachments);
  if (linkURL !== undefined && linkURL !== null) validateHttpURL(linkURL);
  if (contentType === 'link' && !linkURL) {
    throwServiceError('linkURL is required for link messages.');
  }

  if (
    !text.trim() &&
    !attachments.length &&
    !expressions.length &&
    !linkURL &&
    contentType !== 'system'
  ) {
    throwServiceError(
      'A message requires text, linkURL, an attachment, or an expression.',
    );
  }
};

const getConversation = async pointer =>
  new Parse.Query(MESSAGING_CLASSES.CONVERSATION).get(
    getObjectId(pointer),
    masterOptions,
  );

const getMessage = async pointer =>
  new Parse.Query(MESSAGING_CLASSES.MESSAGE).get(
    getObjectId(pointer),
    masterOptions,
  );

export const getActiveMembership = async (conversation, user) =>
  new Parse.Query(MESSAGING_CLASSES.MEMBER)
    .equalTo('conversation', conversation)
    .equalTo('user', user)
    .equalTo('active', true)
    .first(masterOptions);

export const getActiveMembers = async conversation =>
  new Parse.Query(MESSAGING_CLASSES.MEMBER)
    .equalTo('conversation', conversation)
    .equalTo('active', true)
    .include('user')
    .limit(1000)
    .find(masterOptions);

const assertActiveMember = async (conversation, user) => {
  if (conversation.get('isDeleted')) {
    throwServiceError('The conversation has been deleted.');
  }
  const membership = await getActiveMembership(conversation, user);
  if (!membership) {
    throwServiceError('The user is not an active conversation member.');
  }
  return membership;
};

const assertConversationManager = async (conversation, user) => {
  const membership = await assertActiveMember(conversation, user);
  if (['owner', 'admin'].indexOf(membership.get('role')) === -1) {
    throwServiceError('Only conversation owners and admins may manage members.');
  }
  return membership;
};

export const buildACL = users => {
  const acl = new Parse.ACL();
  users.forEach(user => {
    const userId = getObjectId(user);
    if (userId) {
      acl.setReadAccess(userId, true);
      acl.setWriteAccess(userId, true);
    }
  });
  return acl;
};

export const getConversationACL = async (conversation, additionalUsers = []) => {
  const members = await getActiveMembers(conversation);
  const users = members.map(member => member.get('user')).concat(additionalUsers);
  return buildACL(users);
};

const setConversationACL = async (object, conversation, additionalUsers = []) => {
  object.setACL(await getConversationACL(conversation, additionalUsers));
};

const hasAcceptedConnection = async (leftUser, rightUser) => {
  const forward = new Parse.Query('Connection')
    .equalTo('from', leftUser)
    .equalTo('to', rightUser)
    .equalTo('status', 'accepted');
  const reverse = new Parse.Query('Connection')
    .equalTo('from', rightUser)
    .equalTo('to', leftUser)
    .equalTo('status', 'accepted');
  return Boolean(await Parse.Query.or(forward, reverse).first(masterOptions));
};

const assertAuthorizedMomentViewerSelfJoin = async (
  conversation,
  actor,
  member,
) => {
  if (conversation.get('type') !== 'moment') {
    throwServiceError(
      'Self-joining is allowed only for canonical Moment conversations.',
    );
  }
  if (member.get('role') && member.get('role') !== 'member') {
    throwServiceError('A self-joining Moment viewer must have role member.');
  }
  if (member.get('active') === false) {
    throwServiceError('A new Moment membership must be active.');
  }

  const moment = await getMomentForContextKey(conversation.get('contextKey'));
  const author = moment.get('author');
  if (
    !getObjectId(author) ||
    getObjectId(conversation.get('creator')) !== getObjectId(author)
  ) {
    throwServiceError(
      'The Moment conversation creator must match the Moment author.',
    );
  }
  if (
    getObjectId(actor) !== getObjectId(author) &&
    !(await hasAcceptedConnection(actor, author))
  ) {
    throwServiceError(
      'Only the Moment author or an accepted connection may join comments.',
    );
  }
  member.set('role', 'member');
};

export const beforeSaveConversation = async request => {
  const actor = requireUser(request) || request.object.get('creator');
  const conversation = request.object;
  const isNew = isNewRequest(request);

  if (
    !request.master &&
    !isNew &&
    (hasChanged(request, 'clientConversationId') ||
      hasChanged(request, 'contextKey'))
  ) {
    throwServiceError(
      'Conversation idempotency fields are server-managed and cannot be changed.',
    );
  }

  assertAllowedFields(
    request,
    isNew
      ? [
          'clientConversationId',
          'contextKey',
          'creator',
          'expressions',
          'title',
          'type',
        ]
      : ['expressions', 'isDeleted', 'title', 'type'],
  );

  if (isNew) {
    if (!actor) throwServiceError('A conversation creator is required.');
    if (!request.master && conversation.get('contextKey')) {
      await assertMomentContextAuthority(actor, {
        contextKey: conversation.get('contextKey'),
        type: conversation.get('type'),
      });
    }
    conversation.set('creator', actor);
    conversation.set('isDeleted', false);
    conversation.set('membershipRevision', 0);
    conversation.set('lastActivityAt', new Date());
    conversation.set('type', conversation.get('type') || 'group');
    conversation.setACL(buildACL([actor]));
  } else {
    if (pointerChanged(request, 'creator')) {
      throwServiceError('Conversation creator cannot be changed.');
    }
    if (request.original.get('isDeleted') && !request.master) {
      throwServiceError('Deleted conversations cannot be modified.');
    }
    if (!request.master) {
      const expressionOnly = getDirtyKeys(request).every(
        field => field === 'expressions',
      );
      if (expressionOnly) await assertActiveMember(conversation, actor);
      else await assertConversationManager(request.original, actor);
    }
    if (
      request.original.get('isDeleted') &&
      hasChanged(request, 'expressions') &&
      !request.master
    ) {
      throwServiceError('Expressions cannot be added to a deleted conversation.');
    }
    if (hasChanged(request, 'isDeleted')) {
      if (conversation.get('isDeleted')) {
        conversation.set('deletedAt', new Date());
      } else if (!request.master) {
        throwServiceError('Deleted conversations cannot be restored by a client.');
      } else {
        conversation.unset('deletedAt');
      }
    }
    await setConversationACL(conversation, conversation);
  }

  requireString(
    conversation.get('title') || '',
    'title',
    MESSAGING_LIMITS.MAX_TITLE_LENGTH,
    true,
  );
  requireEnum(conversation.get('type') || 'group', 'type', CONVERSATION_TYPES);
  validateClientConversationId(conversation.get('clientConversationId'));
  validateContextKey(conversation.get('contextKey'));
  validateExpressions(request, actor);
};

export const beforeSaveMember = async request => {
  const actor = requireUser(request);
  const member = request.object;
  const isNew = isNewRequest(request);
  if (isTrustedInternalWrite(request)) return;
  const conversation = await getConversation(requirePointer(member, 'conversation'));
  const targetPointer = requirePointer(member, 'user');
  const targetUser = await new Parse.Query(Parse.User).get(
    getObjectId(targetPointer),
    masterOptions,
  );

  if (!request.master && conversation.get('isDeleted')) {
    throwServiceError('The conversation has been deleted.');
  }

  assertAllowedFields(
    request,
    isNew
      ? ['active', 'conversation', 'notificationsEnabled', 'role', 'user']
      : [
          'active',
          'isHidden',
          'lastReadAt',
          'lastReadMessage',
          'notificationsEnabled',
          'role',
          'typingExpiresAt',
        ],
  );

  if (!isNew && (pointerChanged(request, 'conversation') || pointerChanged(request, 'user'))) {
    throwServiceError('Membership identity cannot be changed.');
  }

  if (!request.master) {
    const targetIsActor = getObjectId(targetUser) === getObjectId(actor);
    const actorIsCreator =
      getObjectId(actor) === getObjectId(conversation.get('creator'));
    let isInitialCreatorJoin = false;
    if (isNew && targetIsActor && actorIsCreator) {
      const existingCreatorMembership = await new Parse.Query(
        MESSAGING_CLASSES.MEMBER,
      )
        .equalTo('conversation', conversation)
        .equalTo('user', actor)
        .first(masterOptions);
      if (!existingCreatorMembership) {
        if (member.get('role') && member.get('role') !== 'owner') {
          throwServiceError(
            'An initial conversation creator membership must have role owner.',
          );
        }
        member.set('role', 'owner');
        isInitialCreatorJoin = true;
      }
    }
    const isViewerSelfJoin =
      isNew &&
      targetIsActor &&
      !actorIsCreator;
    if (isViewerSelfJoin) {
      await assertAuthorizedMomentViewerSelfJoin(
        conversation,
        actor,
        member,
      );
    }
    const selfServiceFields = [
      'lastReadAt',
      'lastReadMessage',
      'isHidden',
      'notificationsEnabled',
      'typingExpiresAt',
    ];
    const changedOnlySelfServiceFields = getDirtyKeys(request).every(
      field => selfServiceFields.indexOf(field) !== -1,
    );
    const isSelfDeactivation =
      targetIsActor &&
      !isNew &&
      getDirtyKeys(request).every(field => field === 'active') &&
      request.original.get('active') === true &&
      member.get('active') === false;

    if (hasChanged(request, 'typingExpiresAt') && !targetIsActor) {
      throwServiceError('Only the member may update their typing state.');
    }
    if (hasChanged(request, 'isHidden') && !targetIsActor) {
      throwServiceError('Only the member may update their hidden state.');
    }

    if (
      targetIsActor &&
      !isNew &&
      changedOnlySelfServiceFields &&
      !member.get('active')
    ) {
      throwServiceError('Inactive members cannot update conversation state.');
    }

    if (
      !(targetIsActor && !isNew && changedOnlySelfServiceFields) &&
      !isSelfDeactivation &&
      !isViewerSelfJoin &&
      !isInitialCreatorJoin
    ) {
      await assertConversationManager(conversation, actor);
    }
  }

  if (hasChanged(request, 'typingExpiresAt')) {
    const typingExpiresAt = member.get('typingExpiresAt');
    if (
      typingExpiresAt !== undefined &&
      typingExpiresAt !== null &&
      (!(typingExpiresAt instanceof Date) ||
        typingExpiresAt.getTime() >
          Date.now() + MESSAGING_LIMITS.MAX_TYPING_EXPIRY_MS)
    ) {
      throwServiceError('typingExpiresAt must be a date no more than 15 seconds ahead.');
    }
  }

  if (hasChanged(request, 'isHidden')) {
    if (typeof member.get('isHidden') !== 'boolean') {
      throwServiceError('isHidden must be a boolean.');
    }
    if (member.get('isHidden')) member.set('hiddenAt', new Date());
    else member.unset('hiddenAt');
  }

  const role = member.get('role') || 'member';
  requireEnum(role, 'role', CONVERSATION_MEMBER_ROLES);
  member.set('role', role);

  if (isNew) {
    member.set('active', member.get('active') !== false);
    member.set('joinedAt', new Date());
    member.set('isHidden', false);
    member.set('notificationsEnabled', member.get('notificationsEnabled') !== false);
    member.set('unreadCount', 0);
  }

  if (hasChanged(request, 'active')) {
    if (member.get('active')) member.unset('leftAt');
    else member.set('leftAt', new Date());
  }

  await setConversationACL(member, conversation, [targetUser]);
};

const assertReplyBelongsToConversation = async (replyPointer, conversation) => {
  if (!replyPointer) return;
  let reply;
  try {
    reply = await getMessage(replyPointer);
  } catch (error) {
    MessagingMetricsService.error('reply_target_lookup_failed', error, {
      conversationId: getObjectId(conversation),
      replyToId: getObjectId(replyPointer),
    });
    throw error;
  }
  if (
    getObjectId(reply.get('conversation')) !== getObjectId(conversation) ||
    reply.get('isDeleted')
  ) {
    throwServiceError('replyTo must reference an active message in this conversation.');
  }
};

export const beforeSaveMessage = async request => {
  const actor = requireUser(request) || request.object.get('author');
  const message = request.object;
  const isNew = isNewRequest(request);
  if (isTrustedInternalWrite(request)) return;
  const conversation = await getConversation(requirePointer(message, 'conversation'));
  const membership = request.master
    ? undefined
    : await assertActiveMember(conversation, actor);

  assertAllowedFields(
    request,
    isNew
      ? [
          'attachments',
          'clientCreatedAt',
          'clientMessageId',
          'contentType',
          'conversation',
          'deliveryType',
          'expressions',
          'linkURL',
          'metadata',
          'replyTo',
          'text',
        ]
      : [
          'attachments',
          'expressions',
          'isDeleted',
          'isPinned',
          'linkURL',
          'metadata',
          'text',
        ],
  );

  if (isNew) {
    if (!actor) throwServiceError('A message author is required.');
    message.set('author', actor);
    message.set('contentType', message.get('contentType') || 'text');
    message.set('deliveryType', message.get('deliveryType') || 'respectful');
    message.set('isDeleted', false);
    message.set('isPinned', false);
    message.set('replyCount', 0);
    validateClientMessageId(message.get('clientMessageId'));
  } else {
    if (pointerChanged(request, 'author') || pointerChanged(request, 'conversation')) {
      throwServiceError('Message author and conversation cannot be changed.');
    }
    if (request.original.get('isDeleted') && !request.master) {
      throwServiceError('Deleted messages cannot be modified.');
    }

    const actorIsAuthor =
      getObjectId(request.original.get('author')) === getObjectId(actor);
    if (
      !request.master &&
      (hasChanged(request, 'text') ||
        hasChanged(request, 'attachments') ||
        hasChanged(request, 'linkURL') ||
        hasChanged(request, 'metadata') ||
        hasChanged(request, 'isDeleted')) &&
      !actorIsAuthor
    ) {
      throwServiceError('Only the author may edit or delete a message.');
    }

    if (hasChanged(request, 'isPinned') && !request.master) {
      const manager = actorIsAuthor
        ? membership
        : await assertConversationManager(conversation, actor);
      const role = manager && manager.get('role');
      if (!actorIsAuthor && ['owner', 'admin'].indexOf(role) === -1) {
        throwServiceError('Only authors, owners, and admins may pin a message.');
      }
      if (message.get('isPinned')) {
        message.set('pinnedAt', new Date());
        message.set('pinnedBy', actor);
      } else {
        message.unset('pinnedAt');
        message.unset('pinnedBy');
      }
    }

    if (
      hasChanged(request, 'text') ||
      hasChanged(request, 'attachments') ||
      hasChanged(request, 'linkURL') ||
      hasChanged(request, 'metadata')
    ) {
      message.set('editedAt', new Date());
    }
    if (hasChanged(request, 'isDeleted')) {
      if (message.get('isDeleted')) {
        message.set('deletedAt', new Date());
        message.set('text', '');
        message.unset('linkURL');
      } else {
        throwServiceError('Deleted messages cannot be restored by a client.');
      }
    }
  }

  requireEnum(message.get('deliveryType'), 'deliveryType', MESSAGE_DELIVERY_TYPES);
  await assertReplyBelongsToConversation(message.get('replyTo'), conversation);
  validateExpressions(request, actor);
  if (!message.get('isDeleted')) validateMessageContent(message);
  await setConversationACL(message, conversation, [actor]);
};

export const beforeSaveReaction = async request => {
  const actor = requireUser(request) || request.object.get('user');
  const reaction = request.object;
  const isNew = isNewRequest(request);
  if (isTrustedInternalWrite(request)) return;
  const message = await getMessage(requirePointer(reaction, 'message'));
  const conversation = await getConversation(message.get('conversation'));

  if (!request.master) await assertActiveMember(conversation, actor);
  assertAllowedFields(
    request,
    isNew ? ['message', 'type'] : ['isDeleted'],
  );

  if (isNew) {
    reaction.set('user', actor);
    reaction.set('conversation', conversation);
    reaction.set('isDeleted', false);
  } else if (
    pointerChanged(request, 'message') ||
    pointerChanged(request, 'user') ||
    pointerChanged(request, 'conversation')
  ) {
    throwServiceError('Reaction identity cannot be changed.');
  } else if (
    !request.master &&
    getObjectId(request.original.get('user')) !== getObjectId(actor)
  ) {
    throwServiceError('Only the reaction owner may update it.');
  }

  requireString(
    reaction.get('type'),
    'type',
    MESSAGING_LIMITS.MAX_REACTION_TYPE_LENGTH,
  );
  if (!/^[A-Za-z0-9._:-]+$/.test(reaction.get('type'))) {
    throwServiceError('Reaction type has an invalid format.');
  }
  if (hasChanged(request, 'isDeleted') && reaction.get('isDeleted')) {
    reaction.set('deletedAt', new Date());
  } else if (
    hasChanged(request, 'isDeleted') &&
    !reaction.get('isDeleted') &&
    !request.master
  ) {
    throwServiceError('Deleted reactions cannot be restored by a client.');
  }
  await setConversationACL(reaction, conversation, [actor]);
};

export const beforeSaveReceipt = async request => {
  const actor = requireUser(request) || request.object.get('user');
  const receipt = request.object;
  const isNew = isNewRequest(request);
  if (isTrustedInternalWrite(request)) return;
  const message = await getMessage(requirePointer(receipt, 'message'));
  const conversation = await getConversation(message.get('conversation'));

  if (!request.master) await assertActiveMember(conversation, actor);
  assertAllowedFields(request, isNew ? ['message', 'state'] : ['state']);

  if (isNew) {
    receipt.set('user', actor);
    receipt.set('conversation', conversation);
    receipt.set('messageCreatedAt', message.createdAt || new Date());
  } else if (
    pointerChanged(request, 'message') ||
    pointerChanged(request, 'user') ||
    pointerChanged(request, 'conversation')
  ) {
    throwServiceError('Receipt identity cannot be changed.');
  } else if (
    !request.master &&
    getObjectId(request.original.get('user')) !== getObjectId(actor)
  ) {
    throwServiceError('Only the receipt owner may update it.');
  }

  const state = receipt.get('state') || 'read';
  requireEnum(state, 'state', MESSAGE_RECEIPT_STATES);
  const previousState = request.original && request.original.get('state');
  if (!request.master && previousState) {
    const isUnreadReversal = previousState === 'read' && state === 'delivered';
    const isUnsupportedDowngrade =
      MESSAGE_RECEIPT_STATES.indexOf(state) <
        MESSAGE_RECEIPT_STATES.indexOf(previousState) && !isUnreadReversal;
    if (isUnsupportedDowngrade) {
      throwServiceError('Receipt state cannot move backwards to sent.');
    }
  }

  receipt.set('state', state);
  if (state === 'delivered' && !receipt.get('deliveredAt')) {
    receipt.set('deliveredAt', new Date());
  }
  if (state === 'read' && !receipt.get('readAt')) {
    receipt.set('readAt', new Date());
  } else if (state === 'delivered' && previousState === 'read') {
    receipt.unset('readAt');
  }
  await setConversationACL(receipt, conversation, [actor]);
};

export const beforeDeleteMessagingObject = request => {
  if (!request.master) {
    throwServiceError('Messaging records use tombstones and cannot be hard-deleted.');
  }
};

const updateConversationSummary = async (message, force = false) => {
  const conversation = await getConversation(message.get('conversation'));
  let latestMessage = message;

  if (
    !force &&
    !message.get('isDeleted') &&
    getObjectId(conversation.get('latestMessage')) !== message.id
  ) {
    return;
  }

  if (force || message.get('isDeleted')) {
    latestMessage = await new Parse.Query(MESSAGING_CLASSES.MESSAGE)
      .equalTo('conversation', conversation)
      .notEqualTo('isDeleted', true)
      .descending('createdAt')
      .addDescending('objectId')
      .first(masterOptions);
  }

  if (latestMessage) {
    conversation.set('latestMessage', latestMessage);
    conversation.set('latestMessageAt', latestMessage.createdAt || new Date());
    conversation.set('latestMessageAuthor', latestMessage.get('author'));
    conversation.set('latestMessageText', latestMessage.get('text') || '');
    conversation.set('lastActivityAt', latestMessage.createdAt || new Date());
  } else {
    conversation.unset('latestMessage');
    conversation.unset('latestMessageAt');
    conversation.unset('latestMessageAuthor');
    conversation.set('latestMessageText', '');
  }

  await conversation.save(null, masterOptions);
};

const refreshReplySummary = async reply => {
  const rootPointer = reply.get('replyTo');
  if (!getObjectId(rootPointer)) return;

  const root = await getMessage(rootPointer);
  const countQuery = new Parse.Query(MESSAGING_CLASSES.MESSAGE)
    .equalTo('replyTo', root)
    .equalTo('isDeleted', false);
  const latestQuery = new Parse.Query(MESSAGING_CLASSES.MESSAGE)
    .equalTo('replyTo', root)
    .equalTo('isDeleted', false)
    .descending('createdAt')
    .addDescending('objectId');
  const [replyCount, latestReply] = await Promise.all([
    countQuery.count(masterOptions),
    latestQuery.first(masterOptions),
  ]);

  root.set('replyCount', replyCount);
  if (latestReply) {
    root.set('latestReply', latestReply);
    root.set('latestReplyAt', latestReply.createdAt || new Date());
    root.set('latestReplyAuthor', latestReply.get('author'));
    root.set(
      'latestReplyText',
      (latestReply.get('text') || '').slice(
        0,
        MESSAGING_LIMITS.MAX_REPLY_SUMMARY_TEXT_LENGTH,
      ),
    );
  } else {
    root.unset('latestReply');
    root.unset('latestReplyAt');
    root.unset('latestReplyAuthor');
    root.unset('latestReplyText');
  }

  await root.save(null, {
    ...masterOptions,
    context: { messagingDerivedState: true },
  });
};

const upsertMessageReceipts = async message => {
  const conversation = await getConversation(message.get('conversation'));
  const members = await getActiveMembers(conversation);

  await Promise.all(
    members.map(async member => {
      const user = member.get('user');
      let receipt = await new Parse.Query(MESSAGING_CLASSES.RECEIPT)
        .equalTo('message', message)
        .equalTo('user', user)
        .first(masterOptions);

      if (!receipt) receipt = new Parse.Object(MESSAGING_CLASSES.RECEIPT);
      receipt.set('message', message);
      receipt.set('conversation', conversation);
      receipt.set('user', user);
      receipt.set('messageCreatedAt', message.createdAt || new Date());
      receipt.set(
        'state',
        getObjectId(user) === getObjectId(message.get('author'))
          ? 'read'
          : 'delivered',
      );
      if (receipt.get('state') === 'read') receipt.set('readAt', new Date());
      if (receipt.get('state') === 'delivered') {
        receipt.set('deliveredAt', new Date());
      }
      await setConversationACL(receipt, conversation, [user]);
      return receipt.save(null, {
        ...masterOptions,
        context: { messagingTrustedWrite: true },
      });
    }),
  );
};

const markDeletedMessageReceiptsRead = async message => {
  const receipts = await new Parse.Query(MESSAGING_CLASSES.RECEIPT)
    .equalTo('message', message)
    .notEqualTo('state', 'read')
    .limit(1000)
    .find(masterOptions);
  receipts.forEach(receipt => {
    receipt.set('state', 'read');
    receipt.set('readAt', new Date());
  });
  if (receipts.length) {
    await Parse.Object.saveAll(receipts, {
      ...masterOptions,
      context: { messagingTrustedWrite: true },
    });
  }
};

const sendNewMessagePush = async message => {
  const conversation = await getConversation(message.get('conversation'));
  const members = await getActiveMembers(conversation);
  const author = message.get('author');
  const recipients = members
    .filter(member => member.get('notificationsEnabled') !== false)
    .map(member => member.get('user'))
    .filter(user => getObjectId(user) !== getObjectId(author));

  if (!recipients.length) return;

  let title = 'New message';
  try {
    const fullAuthor = await new Parse.Query(Parse.User).get(
      getObjectId(author),
      masterOptions,
    );
    title = UserUtils.getFullName(fullAuthor) || title;
  } catch (error) {
    MessagingMetricsService.warn('push_author_lookup_failed', {
      authorId: getObjectId(author),
      messageId: message.id,
    });
  }

  await PushService.sendMessagingPushNotification(
    {
      author: getObjectId(author),
      body: message.get('text') || 'Sent an attachment',
      conversationId: conversation.id,
      deliveryType: message.get('deliveryType'),
      messageId: message.id,
      title,
    },
    recipients,
  );
};

const revealHiddenConversation = async conversationPointer => {
  const conversation = await getConversation(conversationPointer);
  const hiddenMembers = await new Parse.Query(MESSAGING_CLASSES.MEMBER)
    .equalTo('conversation', conversation)
    .equalTo('active', true)
    .equalTo('isHidden', true)
    .limit(1000)
    .find(masterOptions);
  hiddenMembers.forEach(member => {
    member.set('isHidden', false);
    member.unset('hiddenAt');
  });
  if (hiddenMembers.length) {
    await Parse.Object.saveAll(hiddenMembers, {
      ...masterOptions,
      context: { messagingDerivedState: true },
    });
  }
};

export const afterSaveMessage = async request => {
  const message = request.object;
  const summaryFields = ['isDeleted', 'text'];
  if (
    isNewRequest(request) ||
    summaryFields.some(field => hasChanged(request, field))
  ) {
    await updateConversationSummary(message, isNewRequest(request));
  }

  if (
    getObjectId(message.get('replyTo')) &&
    (isNewRequest(request) ||
      ['isDeleted', 'text'].some(field => hasChanged(request, field)))
  ) {
    await refreshReplySummary(message);
  }

  if (isNewRequest(request)) {
    await revealHiddenConversation(message.get('conversation'));
    await upsertMessageReceipts(message);
    try {
      await sendNewMessagePush(message);
    } catch (error) {
      MessagingMetricsService.error('push_failed', error, {
        conversationId: getObjectId(message.get('conversation')),
        messageId: message.id,
      });
    }
  } else if (
    hasChanged(request, 'isDeleted') &&
    message.get('isDeleted')
  ) {
    await markDeletedMessageReceiptsRead(message);
  }
};

export const recalculateUnreadCount = async (conversation, user) => {
  const membership = await getActiveMembership(conversation, user);
  if (!membership) return undefined;

  const unreadCount = await new Parse.Query(MESSAGING_CLASSES.RECEIPT)
    .equalTo('conversation', conversation)
    .equalTo('user', user)
    .notEqualTo('state', 'read')
    .count(masterOptions);
  membership.set('unreadCount', unreadCount);
  await membership.save(null, {
    ...masterOptions,
    context: { messagingDerivedState: true },
  });
  return membership;
};

export const afterSaveReceipt = async request => {
  if (request.context && request.context.skipUnreadRecalculation) return;
  if (!isNewRequest(request) && !hasChanged(request, 'state')) return;
  const receipt = request.object;
  await recalculateUnreadCount(
    receipt.get('conversation'),
    receipt.get('user'),
  );
};

const valuesEqual = (left, right) => {
  if (left === right) return true;
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  if (
    left &&
    right &&
    (left.id || left.objectId) &&
    (right.id || right.objectId)
  ) {
    return getObjectId(left) === getObjectId(right);
  }
  return false;
};

const membershipAccessChanged = request =>
  !request.original ||
  accessFields.some(
    field =>
      !valuesEqual(request.object.get(field), request.original.get(field)),
  );

const saveACLPage = async (className, conversation, acl) => {
  let page;
  let skip = 0;
  do {
    // eslint-disable-next-line no-await-in-loop
    page = await new Parse.Query(className)
      .equalTo('conversation', conversation)
      .ascending('objectId')
      .skip(skip)
      .limit(100)
      .find(masterOptions);
    page.forEach(object => object.setACL(acl));
    if (page.length) {
      // eslint-disable-next-line no-await-in-loop
      await Parse.Object.saveAll(page, {
        ...masterOptions,
        context: {
          messagingACLPropagation: true,
          skipConversationACLSync: true,
        },
      });
    }
    skip += page.length;
  } while (page.length === 100);
};

export const synchronizeConversationACL = async conversationPointer => {
  const conversation = await getConversation(conversationPointer);
  const acl = await getConversationACL(conversation);
  const classes = [
    MESSAGING_CLASSES.MEMBER,
    MESSAGING_CLASSES.MESSAGE,
    MESSAGING_CLASSES.REACTION,
    MESSAGING_CLASSES.RECEIPT,
  ];

  conversation.setACL(acl);
  conversation.increment('membershipRevision');
  await conversation.save(null, masterOptions);

  await Promise.all(
    classes.map(className => saveACLPage(className, conversation, acl)),
  );
};

/**
 * Adds or reactivates conversation members through the same membership and ACL
 * invariants used by direct Parse writes. Internal workflows call this helper
 * instead of creating ConversationMember rows ad hoc.
 */
const getMembershipUsers = async memberIds => {
  if (memberIds.length > 1000) {
    throwServiceError('A conversation may not request more than 1000 members.');
  }
  const users = await new Parse.Query(Parse.User)
    .containedIn('objectId', memberIds)
    .limit(1000)
    .find(masterOptions);
  if (users.length !== memberIds.length) {
    throwServiceError('One or more conversation members do not exist.');
  }
  const usersById = users.reduce(
    (result, user) => ({ ...result, [user.id]: user }),
    {},
  );
  return memberIds.map(memberId => usersById[memberId]);
};

const findMembership = (conversation, user) =>
  new Parse.Query(MESSAGING_CLASSES.MEMBER)
    .equalTo('conversation', conversation)
    .equalTo('user', user)
    .first(masterOptions);

const configureMembership = (
  membership,
  conversation,
  user,
  creator,
  acl,
) => {
  const isNew = !membership.id;
  const isReactivation = !isNew && membership.get('active') !== true;
  membership.set('conversation', conversation);
  membership.set('user', user);
  if (getObjectId(user) === getObjectId(creator)) {
    membership.set('role', 'owner');
  } else {
    membership.set('role', membership.get('role') || 'member');
  }
  membership.set('active', true);
  membership.unset('leftAt');
  membership.set('joinedAt', membership.get('joinedAt') || new Date());
  if (isNew || isReactivation) {
    membership.set('isHidden', false);
    membership.unset('hiddenAt');
  }
  if (membership.get('notificationsEnabled') === undefined) {
    membership.set('notificationsEnabled', true);
  }
  if (!Number.isFinite(membership.get('unreadCount'))) {
    membership.set('unreadCount', 0);
  }
  membership.setACL(acl);
  return membership;
};

const saveMembershipWithRaceRecovery = async (
  conversation,
  user,
  creator,
  acl,
) => {
  let membership = await findMembership(conversation, user);
  if (!membership) membership = new Parse.Object(MESSAGING_CLASSES.MEMBER);
  configureMembership(membership, conversation, user, creator, acl);

  try {
    return await membership.save(null, {
      ...masterOptions,
      context: {
        messagingTrustedWrite: true,
        skipConversationACLSync: true,
      },
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    membership = await findMembership(conversation, user);
    if (!membership) throw error;
    configureMembership(membership, conversation, user, creator, acl);
    return membership.save(null, {
      ...masterOptions,
      context: {
        messagingTrustedWrite: true,
        skipConversationACLSync: true,
      },
    });
  }
};

const ensureConversationMemberships = async (
  conversation,
  creator,
  requestedMemberIds,
) => {
  const memberIds = Array.from(
    new Set(requestedMemberIds.map(getObjectId).filter(Boolean)),
  );
  if (!memberIds.length) return [];
  const users = await getMembershipUsers(memberIds);
  const acl = await getConversationACL(conversation, users);
  await Promise.all(
    users.map(user =>
      saveMembershipWithRaceRecovery(
        conversation,
        user,
        creator,
        acl,
      ),
    ),
  );

  const memberships = await new Parse.Query(MESSAGING_CLASSES.MEMBER)
    .equalTo('conversation', conversation)
    .containedIn('user', users)
    .limit(1000)
    .find(masterOptions);
  const activeUserIds = new Set(
    memberships
      .filter(membership => membership.get('active') === true)
      .map(membership => getObjectId(membership.get('user'))),
  );
  if (
    memberships.length !== users.length ||
    memberIds.some(memberId => !activeUserIds.has(memberId))
  ) {
    throwServiceError('Conversation memberships could not be verified.');
  }
  await synchronizeConversationACL(conversation);
  return memberships;
};

export const addConversationMembers = async (actor, params = {}) => {
  if (!actor) throwServiceError('Authentication is required.');
  const conversation = await getConversation(params.conversationId);
  await assertConversationManager(conversation, actor);
  return ensureConversationMemberships(
    conversation,
    conversation.get('creator'),
    params.memberIds || [],
  );
};

const ensureConversationManager = async conversation => {
  const remainingMembers = await new Parse.Query(MESSAGING_CLASSES.MEMBER)
    .equalTo('conversation', conversation)
    .equalTo('active', true)
    .ascending('joinedAt')
    .addAscending('objectId')
    .limit(1000)
    .find(masterOptions);
  if (
    !remainingMembers.length ||
    remainingMembers.some(member =>
      ['owner', 'admin'].includes(member.get('role')),
    )
  ) {
    return undefined;
  }

  const promotedMember = remainingMembers[0];
  promotedMember.set('role', 'owner');
  await promotedMember.save(null, {
    ...masterOptions,
    context: {
      messagingTrustedWrite: true,
      skipConversationACLSync: true,
    },
  });
  return promotedMember;
};

/**
 * Deactivates every membership owned by a deleted user while preserving
 * shared conversation history for the remaining members.
 */
export const deactivateUserMemberships = async (userId, options = {}) => {
  if (!userId) throwServiceError('userId is required.');
  const user = createPointer('_User', userId);
  const requestedPageSize = Number(options.pageSize || 100);
  const pageSize = Number.isInteger(requestedPageSize)
    ? Math.min(1000, Math.max(1, requestedPageSize))
    : 100;
  const conversationsById = new Map();
  let deactivatedCount = 0;
  let memberships;
  do {
    // The query intentionally has no skip: each saved page stops matching the
    // active constraint, making pagination safe while the result set mutates.
    // eslint-disable-next-line no-await-in-loop
    memberships = await new Parse.Query(MESSAGING_CLASSES.MEMBER)
      .equalTo('user', user)
      .equalTo('active', true)
      .include('conversation')
      .limit(pageSize)
      .find(masterOptions);
    const now = new Date();
    memberships.forEach(membership => {
      membership.set('active', false);
      membership.set('leftAt', now);
      membership.unset('typingExpiresAt');
      const conversation = membership.get('conversation');
      conversationsById.set(getObjectId(conversation), conversation);
    });
    if (memberships.length) {
      // eslint-disable-next-line no-await-in-loop
      await Parse.Object.saveAll(memberships, {
        ...masterOptions,
        context: {
          messagingTrustedWrite: true,
          skipConversationACLSync: true,
        },
      });
      deactivatedCount += memberships.length;
    }
  } while (memberships.length === pageSize);

  const conversations = Array.from(conversationsById.values());
  if (conversations.length) {
    await Promise.all(conversations.map(ensureConversationManager));
    await Promise.all(conversations.map(synchronizeConversationACL));
  }
  return deactivatedCount;
};

export const afterSaveMember = async request => {
  if (request.context && request.context.skipConversationACLSync) return;
  if (membershipAccessChanged(request)) {
    if (
      request.original &&
      request.original.get('active') === true &&
      request.object.get('active') === false
    ) {
      await ensureConversationManager(request.object.get('conversation'));
    }
    await synchronizeConversationACL(request.object.get('conversation'));
  }
};

const findConversationByIdempotencyKeys = async (
  user,
  params,
  options = {},
) => {
  const { clientConversationId, contextKey } = params;
  const byClientPromise = clientConversationId
    ? new Parse.Query(MESSAGING_CLASSES.CONVERSATION)
      .equalTo('creator', user)
      .equalTo('clientConversationId', clientConversationId)
      .first(masterOptions)
    : Promise.resolve(undefined);
  const byContextPromise = contextKey
    ? new Parse.Query(MESSAGING_CLASSES.CONVERSATION)
      .equalTo('contextKey', contextKey)
      .first(masterOptions)
    : Promise.resolve(undefined);
  const [byClient, byContext] = await Promise.all([
    byClientPromise,
    byContextPromise,
  ]);

  if (byClient && byContext && byClient.id !== byContext.id) {
    throwServiceError(
      'Conversation idempotency keys resolve to different conversations.',
    );
  }
  if (
    byClient &&
    contextKey &&
    byClient.get('contextKey') !== contextKey
  ) {
    throwServiceError(
      'Conversation idempotency keys resolve to different conversations.',
    );
  }

  const conversation = byClient || byContext;
  if (!conversation) return undefined;
  if (conversation.get('isDeleted')) {
    throwServiceError('A deleted conversation cannot be recovered for reuse.');
  }

  const actorIsCreator =
    getObjectId(conversation.get('creator')) === getObjectId(user);
  const membership = await new Parse.Query(MESSAGING_CLASSES.MEMBER)
    .equalTo('conversation', conversation)
    .equalTo('user', user)
    .first(masterOptions);
  const isActiveManager =
    membership &&
    membership.get('active') === true &&
    ['owner', 'admin'].includes(membership.get('role'));
  const canRepairMissingCreator =
    options.allowMissingCreatorRepair &&
    actorIsCreator &&
    !membership &&
    Number(conversation.get('membershipRevision') || 0) === 0;
  if (!isActiveManager && !canRepairMissingCreator) {
    throwServiceError('Conversation idempotency key is already in use.');
  }
  return conversation;
};

export const createConversation = async (user, params = {}, options = {}) => {
  if (!user) throwServiceError('Authentication is required.');
  validateClientConversationId(params.clientConversationId);
  validateContextKey(params.contextKey);
  await assertMomentContextAuthority(user, params, options);

  const memberIds = Array.from(
    new Set([user.id].concat(params.memberIds || []).filter(Boolean)),
  );
  const users = await getMembershipUsers(memberIds);
  const repairAndReturn = async conversation => {
    if (Number(conversation.get('membershipRevision') || 0) === 0) {
      await ensureConversationMemberships(
        conversation,
        conversation.get('creator'),
        memberIds,
      );
    }
    return conversation;
  };

  const lookupOptions = { allowMissingCreatorRepair: true };
  const existing = await findConversationByIdempotencyKeys(
    user,
    params,
    lookupOptions,
  );
  if (existing) {
    MessagingMetricsService.info('duplicate_conversation_suppressed', {
      clientConversationId: params.clientConversationId,
      contextKey: params.contextKey,
      conversationId: existing.id,
      creatorId: user.id,
    });
    return repairAndReturn(existing);
  }

  const conversation = new Parse.Object(MESSAGING_CLASSES.CONVERSATION);
  conversation.set('creator', user);
  if (params.clientConversationId) {
    conversation.set('clientConversationId', params.clientConversationId);
  }
  if (params.contextKey) conversation.set('contextKey', params.contextKey);
  conversation.set('title', params.title || '');
  conversation.set(
    'type',
    params.type || (memberIds.length > 2 ? 'group' : 'direct'),
  );
  conversation.set('isDeleted', false);
  conversation.set('membershipRevision', 0);
  conversation.set('lastActivityAt', new Date());
  conversation.setACL(buildACL(users));
  try {
    await conversation.save(null, masterOptions);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const duplicate = await findConversationByIdempotencyKeys(
        user,
        params,
        lookupOptions,
      );
      if (duplicate) return repairAndReturn(duplicate);
    }
    throw error;
  }
  return repairAndReturn(conversation);
};

const assertMessageIdempotencyOwner = (message, user) => {
  if (
    message &&
    getObjectId(message.get('author')) !== getObjectId(user)
  ) {
    throwServiceError(
      'clientMessageId collision: this identifier is already owned by another conversation member.',
    );
  }
  return message;
};

export const sendMessage = async (user, params = {}) => {
  if (!user) throwServiceError('Authentication is required.');
  validateClientMessageId(params.clientMessageId);
  const conversation = await getConversation(params.conversationId);
  await assertActiveMember(conversation, user);

  const existing = await new Parse.Query(MESSAGING_CLASSES.MESSAGE)
    .equalTo('conversation', conversation)
    .equalTo('clientMessageId', params.clientMessageId)
    .first(masterOptions);
  if (existing) {
    assertMessageIdempotencyOwner(existing, user);
    MessagingMetricsService.info('duplicate_suppressed', {
      clientMessageId: params.clientMessageId,
      conversationId: conversation.id,
      messageId: existing.id,
    });
    return existing;
  }

  const message = new Parse.Object(MESSAGING_CLASSES.MESSAGE);
  message.set('attachments', params.attachments || []);
  message.set('author', user);
  message.set('clientCreatedAt', params.clientCreatedAt || new Date());
  message.set('clientMessageId', params.clientMessageId);
  message.set('contentType', params.contentType || 'text');
  message.set('conversation', conversation);
  message.set('deliveryType', params.deliveryType || 'respectful');
  message.set('expressions', params.expressions || []);
  if (params.linkURL) message.set('linkURL', params.linkURL);
  message.set('metadata', params.metadata || {});
  message.set('text', params.text || '');
  message.set('isDeleted', false);
  message.set('isPinned', false);
  if (params.replyToId) {
    message.set('replyTo', createPointer(MESSAGING_CLASSES.MESSAGE, params.replyToId));
  }
  message.setACL(await getConversationACL(conversation, [user]));

  validateExpressions({ object: message }, user);
  validateMessageContent(message);
  await assertReplyBelongsToConversation(message.get('replyTo'), conversation);

  try {
    return await message.save(null, masterOptions);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const duplicate = await new Parse.Query(MESSAGING_CLASSES.MESSAGE)
        .equalTo('conversation', conversation)
        .equalTo('clientMessageId', params.clientMessageId)
        .first(masterOptions);
      if (duplicate) return assertMessageIdempotencyOwner(duplicate, user);
    }
    throw error;
  }
};

export const getMessageByClientId = async (user, params = {}) => {
  if (!user) throwServiceError('Authentication is required.');
  validateClientMessageId(params.clientMessageId);
  const conversation = await getConversation(params.conversationId);
  await assertActiveMember(conversation, user);
  const message = await new Parse.Query(MESSAGING_CLASSES.MESSAGE)
    .equalTo('conversation', conversation)
    .equalTo('clientMessageId', params.clientMessageId)
    .first(masterOptions);
  return assertMessageIdempotencyOwner(message, user);
};

export const setConversationHidden = async (user, params = {}) => {
  if (!user) throwServiceError('Authentication is required.');
  if (typeof params.isHidden !== 'boolean') {
    throwServiceError('isHidden must be a boolean.');
  }
  const conversation = await getConversation(params.conversationId);
  const membership = await assertActiveMember(conversation, user);
  membership.set('isHidden', params.isHidden);
  if (params.isHidden) membership.set('hiddenAt', new Date());
  else membership.unset('hiddenAt');
  return membership.save(null, {
    ...masterOptions,
    context: { messagingDerivedState: true },
  });
};

export const addReaction = async (user, params = {}) => {
  if (!user) throwServiceError('Authentication is required.');
  const message = await getMessage(params.messageId);
  const conversation = await getConversation(message.get('conversation'));
  await assertActiveMember(conversation, user);

  let reaction = await new Parse.Query(MESSAGING_CLASSES.REACTION)
    .equalTo('message', message)
    .equalTo('user', user)
    .equalTo('type', params.type)
    .first(masterOptions);
  if (!reaction) reaction = new Parse.Object(MESSAGING_CLASSES.REACTION);
  reaction.set('conversation', conversation);
  reaction.set('isDeleted', false);
  reaction.unset('deletedAt');
  reaction.set('message', message);
  reaction.set('type', params.type);
  reaction.set('user', user);
  reaction.setACL(await getConversationACL(conversation, [user]));
  requireString(
    reaction.get('type'),
    'type',
    MESSAGING_LIMITS.MAX_REACTION_TYPE_LENGTH,
  );
  return reaction.save(null, masterOptions);
};

export const markRead = async (user, params = {}) => {
  if (!user) throwServiceError('Authentication is required.');
  const message = await getMessage(params.messageId);
  const conversation = await getConversation(message.get('conversation'));
  const membership = await assertActiveMember(conversation, user);

  const markReceiptPage = async () => {
    const receipts = await new Parse.Query(MESSAGING_CLASSES.RECEIPT)
      .equalTo('conversation', conversation)
      .equalTo('user', user)
      .lessThanOrEqualTo('messageCreatedAt', message.createdAt)
      .notEqualTo('state', 'read')
      .limit(1000)
      .find(masterOptions);
    receipts.forEach(receipt => {
      receipt.set('state', 'read');
      receipt.set('readAt', new Date());
    });
    if (receipts.length) {
      await Parse.Object.saveAll(receipts, {
        ...masterOptions,
        context: {
          messagingDerivedState: true,
          skipUnreadRecalculation: true,
        },
      });
    }
    if (receipts.length === 1000) await markReceiptPage();
  };
  await markReceiptPage();

  membership.set('lastReadAt', message.createdAt || new Date());
  membership.set('lastReadMessage', message);
  await membership.save(null, {
    ...masterOptions,
    context: { messagingDerivedState: true },
  });
  await recalculateUnreadCount(conversation, user);
  return membership;
};

export const cleanupDeletedAttachments = async () => {
  const graceHours = Number(process.env.MESSAGING_ATTACHMENT_CLEANUP_HOURS || 24);
  const cutoff = new Date(Date.now() - graceHours * 60 * 60 * 1000);
  const messages = await new Parse.Query(MESSAGING_CLASSES.MESSAGE)
    .equalTo('isDeleted', true)
    .lessThan('deletedAt', cutoff)
    .doesNotExist('attachmentsPurgedAt')
    .limit(100)
    .find(masterOptions);

  await Promise.all(
    messages.map(message => {
      // Parse.Files may be referenced by another message or object. Tombstone
      // cleanup detaches this message only; storage-level orphan collection is
      // a separate reference-aware concern.
      message.set('attachments', []);
      message.set('attachmentsPurgedAt', new Date());
      return message.save(null, masterOptions);
    }),
  );
  return messages.length;
};

export const getCapabilities = () => ({
  available: process.env.PARSE_MESSAGING_ENABLED !== 'false',
  minimumAppVersion: process.env.PARSE_MESSAGING_MINIMUM_APP_VERSION || null,
  schemaVersion: MESSAGING_SCHEMA_VERSION,
  features: {
    attachments: true,
    conversationArchive: true,
    edits: true,
    expressions: true,
    liveQuery: true,
    offlineIdempotency: true,
    pins: true,
    reactions: true,
    readReceipts: true,
    replies: true,
    tombstones: true,
    typing: true,
  },
  idempotency: {
    cloudFunction: 'messagingSendMessage',
    conversation: {
      clientConversationIdScope: ['creator', 'clientConversationId'],
      cloudFunction: 'messagingCreateConversation',
      contextKeyScope: ['contextKey'],
    },
    recoveryFunction: 'messagingGetMessageByClientId',
    recoveryKey: ['conversationId', 'clientMessageId'],
  },
  limits: {
    maxAttachmentBytes: MESSAGING_LIMITS.MAX_ATTACHMENT_BYTES,
    maxAttachments: MESSAGING_LIMITS.MAX_ATTACHMENTS,
    maxClientConversationIdLength:
      MESSAGING_LIMITS.MAX_CLIENT_CONVERSATION_ID_LENGTH,
    maxContextKeyLength: MESSAGING_LIMITS.MAX_CONTEXT_KEY_LENGTH,
    maxExpressions: MESSAGING_LIMITS.MAX_EXPRESSIONS,
    maxLinkURLLength: MESSAGING_LIMITS.MAX_LINK_URL_LENGTH,
    maxMessageTextLength: MESSAGING_LIMITS.MAX_MESSAGE_TEXT_LENGTH,
    maxTypingExpiryMs: MESSAGING_LIMITS.MAX_TYPING_EXPIRY_MS,
  },
  vocabulary: {
    attachmentKinds: MESSAGE_ATTACHMENT_KINDS,
    contentTypes: MESSAGE_CONTENT_TYPES,
    conversationTypes: CONVERSATION_TYPES,
    deliveryTypes: MESSAGE_DELIVERY_TYPES,
    memberRoles: CONVERSATION_MEMBER_ROLES,
    receiptStates: MESSAGE_RECEIPT_STATES,
  },
});

export default {
  addReaction,
  addConversationMembers,
  afterSaveMember,
  afterSaveMessage,
  afterSaveReceipt,
  beforeDeleteMessagingObject,
  beforeSaveConversation,
  beforeSaveMember,
  beforeSaveMessage,
  beforeSaveReaction,
  beforeSaveReceipt,
  cleanupDeletedAttachments,
  createConversation,
  deactivateUserMemberships,
  getCapabilities,
  getMessageByClientId,
  markRead,
  sendMessage,
  setConversationHidden,
};
