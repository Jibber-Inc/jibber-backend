import ExtendableError from 'extendable-error-class';
import { v4 as uuidv4 } from 'uuid';
import Parse from '../providers/ParseProvider';
import { ONBOARDING_ADMIN, STATUS_ACCEPTED } from '../constants';
import { MESSAGING_CLASSES } from '../constants/messaging';
import ChatService from './ChatService';
import ConnectionService from './ConnectionService';
import PassService from './PassService';
import ReservationService from './ReservationService';
import {
  addConversationMembers,
  canonicalDirectContextKey,
  createConversation,
  getObjectId,
  sendMessage,
} from './ParseMessagingService';
import {
  loadMessaging,
  ONBOARDING_MESSAGE_KEYS,
  renderMessage,
  resolveMessagingDocument,
} from './OnboardingMessagingService';

export class OnboardingSessionServiceError extends ExtendableError {}

export const ONBOARDING_SESSION_CLASS = 'OnboardingSession';
export const ONBOARDING_FINALIZATION_LEASE_CLASS =
  'OnboardingFinalizationLease';
export const ONBOARDING_STEPS = Object.freeze({
  COMPLETED: 'completed',
  FACE_CAPTURE: 'faceCapture',
  NAME: 'name',
  PHONE: 'phone',
  VERIFICATION: 'verification',
  WELCOME: 'welcome',
});
export const GUIDE_SOURCES = Object.freeze({
  CONFIGURED_AGENT: 'configuredAgent',
  MAYA: 'maya',
  MOMENT: 'moment',
  PASS: 'pass',
  RESERVATION: 'reservation',
});

const masterOptions = { useMasterKey: true };
const finalizationLeaseMilliseconds = 2 * 60 * 1000;
const verificationRestartCooldownMilliseconds = 60 * 1000;
const verificationRestartWindowMilliseconds = 60 * 60 * 1000;
const verificationRestartMaximumPerWindow = 5;
const stepOrder = Object.freeze({
  [ONBOARDING_STEPS.WELCOME]: 0,
  [ONBOARDING_STEPS.PHONE]: 1,
  [ONBOARDING_STEPS.VERIFICATION]: 2,
  [ONBOARDING_STEPS.NAME]: 3,
  [ONBOARDING_STEPS.FACE_CAPTURE]: 4,
  [ONBOARDING_STEPS.COMPLETED]: 5,
});

const isDuplicateKeyError = error =>
  error && (error.code === 137 || /duplicate key/i.test(error.message));

const getUserName = user => {
  if (!user || typeof user.get !== 'function') return 'Someone';
  const fullName = [user.get('givenName'), user.get('familyName')]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || user.get('fullName') || 'Someone';
};

const contextEntries = params => [
  ['reservation', params.reservationId],
  ['pass', params.passId],
  ['moment', params.momentId],
].filter(([, objectId]) => Boolean(objectId));

const invalidInvitationStatuses = new Set([
  'cancelled',
  'canceled',
  'declined',
  'deleted',
  'expired',
  'revoked',
]);

const assertInvitationObjectUsable = (
  object,
  contextType,
  user,
  options = {},
) => {
  if (!object) {
    throw new OnboardingSessionServiceError(
      `The ${contextType} onboarding context does not exist.`,
    );
  }
  const status = String(object.get('status') || '').toLowerCase();
  const expiresAt = object.get('expiresAt');
  if (
    object.get('isDeleted') === true ||
    object.get('isRevoked') === true ||
    object.get('isActive') === false ||
    object.get('deletedAt') ||
    object.get('revokedAt') ||
    invalidInvitationStatuses.has(status) ||
    (expiresAt instanceof Date && expiresAt <= new Date())
  ) {
    throw new OnboardingSessionServiceError(
      `The ${contextType} onboarding context is no longer valid.`,
    );
  }
  if (object.get('isClaimed') === true || status === 'claimed') {
    const claimant = object.get('claimedBy') || object.get('user');
    if (
      !options.allowClaimedByUser ||
      !claimant ||
      getObjectId(claimant) !== user.id
    ) {
      throw new OnboardingSessionServiceError(
        `The ${contextType} onboarding context has already been claimed.`,
      );
    }
  }
  return object;
};

const assertNoDeclinedRelationship = async (user, guide) => {
  const forward = new Parse.Query('Connection')
    .equalTo('from', guide)
    .equalTo('to', user)
    .equalTo('status', 'declined')
    .first(masterOptions);
  const reverse = new Parse.Query('Connection')
    .equalTo('from', user)
    .equalTo('to', guide)
    .equalTo('status', 'declined')
    .first(masterOptions);
  const declined = (await Promise.all([forward, reverse])).find(Boolean);
  if (declined) {
    throw new OnboardingSessionServiceError(
      'A declined relationship cannot be accepted through onboarding.',
    );
  }
};

const getContextObject = async (
  contextType,
  objectId,
  user,
  options = {},
) => {
  let object;
  if (contextType === 'reservation') {
    object = await ReservationService.checkReservation(objectId, user);
  } else {
    const className = contextType === 'pass' ? 'Pass' : 'Moment';
    object = await new Parse.Query(className).get(objectId, masterOptions);
  }
  return assertInvitationObjectUsable(
    object,
    contextType,
    user,
    options,
  );
};

export const validateContextParams = params => {
  const entries = contextEntries(params || {});
  if (entries.length > 1) {
    throw new OnboardingSessionServiceError(
      'Only one onboarding invitation context may be supplied.',
    );
  }
  entries.forEach(([, objectId]) => {
    if (typeof objectId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(objectId)) {
      throw new OnboardingSessionServiceError(
        'The onboarding invitation context is invalid.',
      );
    }
  });
  return entries[0];
};

const getConfiguredGuide = async messaging => {
  const mayaId = process.env.MAYA_BOT_USER_ID;
  const configuredId =
    messaging.guideUserId ||
    (process.env.AI_CHATBOT_ENABLED === 'true' ? mayaId : undefined);
  if (configuredId) {
    const guide = await new Parse.Query(Parse.User).get(
      configuredId,
      masterOptions,
    );
    return {
      guide,
      source:
        mayaId && guide.id === mayaId
          ? GUIDE_SOURCES.MAYA
          : GUIDE_SOURCES.CONFIGURED_AGENT,
    };
  }

  const onboardingRole = await new Parse.Query(Parse.Role)
    .equalTo('name', ONBOARDING_ADMIN)
    .first(masterOptions);
  const guide = onboardingRole
    ? await onboardingRole.get('users').query().first(masterOptions)
    : undefined;
  if (!guide) {
    throw new OnboardingSessionServiceError(
      'No onboarding guide is configured.',
    );
  }
  return {
    guide,
    source:
      mayaId && guide.id === mayaId
        ? GUIDE_SOURCES.MAYA
        : GUIDE_SOURCES.CONFIGURED_AGENT,
  };
};

export const resolveGuide = async (user, params, messaging) => {
  const context = validateContextParams(params);
  if (!context) {
    const resolution = await getConfiguredGuide(messaging);
    await assertNoDeclinedRelationship(user, resolution.guide);
    return resolution;
  }

  const [contextType, objectId] = context;
  const object = await getContextObject(contextType, objectId, user);
  let guide;
  if (contextType === 'reservation') {
    guide = object.get('createdBy');
  } else if (contextType === 'pass') {
    guide = object.get('owner');
  } else {
    guide = object.get('author');
  }
  if (!getObjectId(guide)) {
    throw new OnboardingSessionServiceError(
      'The onboarding invitation does not have a valid guide.',
    );
  }
  guide = await new Parse.Query(Parse.User).get(
    getObjectId(guide),
    masterOptions,
  );
  if (getObjectId(guide) === user.id) {
    throw new OnboardingSessionServiceError(
      'A user cannot be their own onboarding guide.',
    );
  }
  await assertNoDeclinedRelationship(user, guide);
  return {
    contextObject: object,
    contextObjectId: object.id,
    contextType,
    guide,
    source: contextType,
  };
};

export const revalidateSessionContext = async (session, user) => {
  const contextType = session.get('contextType');
  const guide = await new Parse.Query(Parse.User).get(
    getObjectId(session.get('guide')),
    masterOptions,
  );
  if (!contextType || contextType === 'none') {
    await assertNoDeclinedRelationship(user, guide);
    return { guide };
  }
  const contextObject = await getContextObject(
    contextType,
    session.get('contextObjectId'),
    user,
    { allowClaimedByUser: true },
  );
  const currentGuide =
    contextType === 'reservation'
      ? contextObject.get('createdBy')
      : contextObject.get(contextType === 'pass' ? 'owner' : 'author');
  if (getObjectId(currentGuide) !== guide.id) {
    throw new OnboardingSessionServiceError(
      'The onboarding context guide has changed.',
    );
  }
  await assertNoDeclinedRelationship(user, guide);
  return { contextObject, guide };
};

const canonicalPairKey = (leftUser, rightUser) =>
  canonicalDirectContextKey([leftUser, rightUser]);

const getConversationByContextKey = contextKey =>
  new Parse.Query(MESSAGING_CLASSES.CONVERSATION)
    .equalTo('contextKey', contextKey)
    .first(masterOptions);

const canAdoptReservationConversation = async (
  conversation,
  guide,
  user,
  canonicalContextKey,
) => {
  if (!conversation || conversation.get('isDeleted')) return false;
  if (getObjectId(conversation.get('creator')) !== guide.id) return false;
  const existingContextKey = conversation.get('contextKey');
  if (
    existingContextKey &&
    existingContextKey !== canonicalContextKey &&
    !/^legacy:/.test(existingContextKey)
  ) {
    return false;
  }
  const memberships = await new Parse.Query(MESSAGING_CLASSES.MEMBER)
    .equalTo('conversation', conversation)
    .limit(1000)
    .find(masterOptions);
  const allowedUserIds = new Set([guide.id, user.id]);
  return memberships.every(membership =>
    allowedUserIds.has(getObjectId(membership.get('user'))),
  );
};

const addCanonicalMembers = async (conversation, guide, user) => {
  const actor = conversation.get('creator');
  await addConversationMembers(actor, {
    conversationId: conversation.id,
    memberIds: [guide.id, user.id],
  });
  return conversation;
};

const ensureCanonicalConversation = async (
  user,
  resolution,
) => {
  const { guide, contextObject, contextType } = resolution;
  const contextKey = canonicalPairKey(guide, user);
  let conversation = await getConversationByContextKey(contextKey);

  if (!conversation && contextType === 'reservation') {
    const conversationCid = contextObject.get('conversationCid');
    if (conversationCid) {
      const candidate = await ChatService.getConversationByCid(
        conversationCid,
      );
      if (
        !(await canAdoptReservationConversation(
          candidate,
          guide,
          user,
          contextKey,
        ))
      ) {
        throw new OnboardingSessionServiceError(
          'The reservation conversation cannot be safely reused.',
        );
      }
      candidate.set('contextKey', contextKey);
      candidate.set('type', 'direct');
      try {
        conversation = await candidate.save(null, masterOptions);
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        conversation = await getConversationByContextKey(contextKey);
        if (!conversation) throw error;
      }
    }
  }

  if (!conversation) {
    const clientConversationId = contextKey;
    conversation = await createConversation(
      guide,
      {
        clientConversationId,
        contextKey,
        memberIds: [guide.id, user.id],
        title: '',
        type: 'direct',
      },
      { trustedContextKey: true },
    );
  } else {
    await addCanonicalMembers(conversation, guide, user);
  }

  if (
    contextType === 'reservation' &&
    contextObject.get('conversationCid') !== conversation.id
  ) {
    contextObject.set('conversationCid', conversation.id);
    await contextObject.save(null, masterOptions);
  }
  return conversation;
};

const buildSessionACL = user => {
  const acl = new Parse.ACL();
  acl.setReadAccess(user.id, true);
  return acl;
};

const getSessionQuery = user =>
  new Parse.Query(ONBOARDING_SESSION_CLASS)
    .equalTo('user', user)
    .include('conversation')
    .include('guide')
    .include('reservation')
    .include('pass')
    .include('moment');

export const getSessionForUser = user =>
  getSessionQuery(user).first(masterOptions);

const assertSessionContext = (session, params) => {
  const supplied = validateContextParams(params);
  if (!supplied) return;
  const [contextType, contextObjectId] = supplied;
  if (
    session.get('contextType') !== contextType ||
    session.get('contextObjectId') !== contextObjectId
  ) {
    throw new OnboardingSessionServiceError(
      'This account already has a different onboarding invitation context.',
    );
  }
};

const configureSession = (
  session,
  user,
  resolution,
  messaging,
) => {
  session.set('schemaVersion', 1);
  session.set('sessionKey', `user:${user.id}`);
  session.set('user', user);
  session.set('guide', resolution.guide);
  session.set('guideSource', resolution.source);
  session.set('contextType', resolution.contextType || 'none');
  if (resolution.contextObjectId) {
    session.set('contextObjectId', resolution.contextObjectId);
    session.set(resolution.contextType, resolution.contextObject);
  }
  session.set('locale', messaging.locale);
  session.set('messagingRevision', messaging.revision);
  session.set(
    'messagingDocumentJSON',
    JSON.stringify(messaging.document),
  );
  session.set('reachedStep', ONBOARDING_STEPS.NAME);
  session.set('completed', false);
  session.set('attempt', 0);
  session.setACL(buildSessionACL(user));
  return session;
};

const setConversationOnboardingState = async (conversation, session, state) => {
  conversation.set('isOnboardingConversation', true);
  conversation.set('onboardingSession', session);
  conversation.set('onboardingState', state);
  conversation.set('onboardingGuideSource', session.get('guideSource'));
  return conversation.save(null, masterOptions);
};

const markMayaIdentity = async guide => {
  if (guide.get('isAIGuide') === true && guide.get('guideBadge') === 'AI guide') {
    return guide;
  }
  guide.set('isAIGuide', true);
  guide.set('guideBadge', 'AI guide');
  return guide.save(null, masterOptions);
};

const hideHumanGuideMembership = async (session, hidden) => {
  if (session.get('guideSource') === GUIDE_SOURCES.MAYA) return undefined;
  const membership = await new Parse.Query(MESSAGING_CLASSES.MEMBER)
    .equalTo('conversation', session.get('conversation'))
    .equalTo('user', session.get('guide'))
    .first(masterOptions);
  if (!membership) return undefined;
  membership.set('isHidden', hidden);
  if (hidden) {
    membership.set('hiddenAt', new Date());
    membership.set('notificationsEnabled', false);
  } else {
    membership.unset('hiddenAt');
    membership.set('notificationsEnabled', true);
  }
  return membership.save(null, {
    ...masterOptions,
    context: { messagingDerivedState: true },
  });
};

const resolutionFromSession = (session, validated) => {
  const contextType = session.get('contextType');
  return {
    contextObject: validated.contextObject,
    contextObjectId: session.get('contextObjectId'),
    contextType: contextType === 'none' ? undefined : contextType,
    guide: validated.guide,
    source: session.get('guideSource'),
  };
};

const provisionSessionConversation = async (session, user) => {
  const validated = await revalidateSessionContext(session, user);
  let conversation = session.get('conversation');
  if (!getObjectId(conversation)) {
    conversation = await ensureCanonicalConversation(
      user,
      resolutionFromSession(session, validated),
    );
    session.set('conversation', conversation);
    await session.save(null, masterOptions);
  }
  if (session.get('completed')) {
    await hideHumanGuideMembership(session, false);
    await setConversationOnboardingState(conversation, session, 'completed');
    return session;
  }
  if (session.get('guideSource') === GUIDE_SOURCES.MAYA) {
    await markMayaIdentity(validated.guide);
  } else {
    await hideHumanGuideMembership(session, true);
  }
  await setConversationOnboardingState(conversation, session, 'inProgress');
  return session;
};

export const ensureOnboardingSession = async (
  user,
  params = {},
) => {
  if (!(user instanceof Parse.User)) {
    throw new OnboardingSessionServiceError('Authentication is required.');
  }
  const existing = await getSessionForUser(user);
  if (existing) {
    assertSessionContext(existing, params);
    return provisionSessionConversation(existing, user);
  }

  const messaging = await loadMessaging(params.locale);
  const resolution = await resolveGuide(user, params, messaging);
  let session = configureSession(
    new Parse.Object(ONBOARDING_SESSION_CLASS),
    user,
    resolution,
    messaging,
  );
  try {
    session = await session.save(null, masterOptions);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    session = await getSessionForUser(user);
    if (!session) throw error;
    assertSessionContext(session, params);
  }
  return provisionSessionConversation(session, user);
};

export const deriveReachedStep = (user, session) => {
  if (session.get('completed')) return ONBOARDING_STEPS.COMPLETED;
  if (session.get('pendingPhoneNumber')) {
    return ONBOARDING_STEPS.VERIFICATION;
  }
  if (user.get('smsVerificationStatus') !== 'approved') {
    return ONBOARDING_STEPS.PHONE;
  }
  const hasName = Boolean(user.get('givenName') && user.get('familyName'));
  if (!hasName) return ONBOARDING_STEPS.NAME;
  if (!user.get('smallImage')) return ONBOARDING_STEPS.FACE_CAPTURE;
  return ONBOARDING_STEPS.COMPLETED;
};

export const isUserOnboardingComplete = user =>
  user.get('status') === 'active' &&
  Boolean(
    user.get('givenName') &&
    user.get('familyName') &&
    user.get('smallImage'),
  );

const welcomeKey = session => {
  if (session.get('guideSource') === GUIDE_SOURCES.MOMENT) {
    return ONBOARDING_MESSAGE_KEYS.WELCOME_MOMENT;
  }
  if (session.get('contextType') !== 'none') {
    return ONBOARDING_MESSAGE_KEYS.WELCOME_INVITATION;
  }
  return ONBOARDING_MESSAGE_KEYS.WELCOME_STANDARD;
};

const turnKind = key => {
  if (key === 'welcome' || key === 'completed' || key.endsWith('.prompt')) {
    return 'prompt';
  }
  if (key.endsWith('.event')) return 'event';
  return 'complete';
};

const makeTurnId = (session, messaging, key, step) => {
  const attempt = Number(session.get('attempt') || 0);
  const revision = Number(
    session.get('messagingRevision') || messaging.revision || 0,
  );
  const prefix = attempt > 0
    ? `onboarding:${revision}:r${attempt}`
    : `onboarding:${revision}`;
  return `${prefix}:${step}:${turnKind(key)}`;
};

const makeTurn = (
  session,
  messaging,
  author,
  key,
  step,
  messageKey,
  tokens = {},
) => ({
  author,
  clientMessageId: makeTurnId(session, messaging, key, step),
  key,
  step,
  text: renderMessage(messaging.messages[messageKey], tokens, {
    maximumLength: 1000,
  }),
});

const buildReachedTurns = (user, session, messaging, reachedStep) => {
  const guide = session.get('guide');
  const inviterName = getUserName(guide);
  const invited = session.get('contextType') !== 'none';
  const turns = [
    makeTurn(
      session,
      messaging,
      guide,
      'welcome',
      ONBOARDING_STEPS.WELCOME,
      welcomeKey(session),
      { inviterName },
    ),
    makeTurn(
      session,
      messaging,
      guide,
      'phone.prompt',
      ONBOARDING_STEPS.PHONE,
      invited
        ? ONBOARDING_MESSAGE_KEYS.PHONE_INVITED
        : ONBOARDING_MESSAGE_KEYS.PHONE_DEFAULT,
    ),
  ];
  if (stepOrder[reachedStep] >= stepOrder[ONBOARDING_STEPS.VERIFICATION]) {
    turns.push(
      makeTurn(
        session,
        messaging,
        guide,
        'phone.complete',
        ONBOARDING_STEPS.PHONE,
        ONBOARDING_MESSAGE_KEYS.PHONE_COMPLETED,
      ),
      makeTurn(
        session,
        messaging,
        guide,
        'verification.prompt',
        ONBOARDING_STEPS.VERIFICATION,
        ONBOARDING_MESSAGE_KEYS.CODE_PROMPT,
      ),
    );
  }
  if (stepOrder[reachedStep] >= stepOrder[ONBOARDING_STEPS.NAME]) {
    turns.push(
      makeTurn(
        session,
        messaging,
        guide,
        'verification.complete',
        ONBOARDING_STEPS.VERIFICATION,
        ONBOARDING_MESSAGE_KEYS.CODE_COMPLETED,
      ),
      makeTurn(
        session,
        messaging,
        guide,
        'name.prompt',
        ONBOARDING_STEPS.NAME,
        ONBOARDING_MESSAGE_KEYS.NAME_PROMPT,
      ),
    );
  }
  if (stepOrder[reachedStep] >= stepOrder[ONBOARDING_STEPS.FACE_CAPTURE]) {
    turns.push(
      makeTurn(
        session,
        messaging,
        user,
        'name.complete.event',
        ONBOARDING_STEPS.NAME,
        ONBOARDING_MESSAGE_KEYS.NAME_EVENT,
      ),
      makeTurn(
        session,
        messaging,
        guide,
        'faceCapture.prompt',
        ONBOARDING_STEPS.FACE_CAPTURE,
        ONBOARDING_MESSAGE_KEYS.PHOTO_PROMPT,
      ),
    );
  }
  if (stepOrder[reachedStep] >= stepOrder[ONBOARDING_STEPS.COMPLETED]) {
    turns.push(
      makeTurn(
        session,
        messaging,
        user,
        'faceCapture.complete.event',
        ONBOARDING_STEPS.FACE_CAPTURE,
        ONBOARDING_MESSAGE_KEYS.PHOTO_EVENT,
      ),
    );
  }
  if (session.get('completed')) {
    turns.push(
      makeTurn(
        session,
        messaging,
        guide,
        'completed',
        ONBOARDING_STEPS.COMPLETED,
        ONBOARDING_MESSAGE_KEYS.COMPLETED,
      ),
    );
  }
  return turns;
};

const sideEffectSuppression = Object.freeze({
  messagingOnboardingSeed: true,
  suppressConversationReveal: true,
  suppressMayaBot: true,
  suppressMessagingPush: true,
  suppressMessagingUnread: true,
});

const persistTurn = (session, messaging, turn) => {
  const guide = session.get('guide');
  const automated = turn.author.id === guide.id;
  return sendMessage(
    turn.author,
    {
      clientMessageId: turn.clientMessageId,
      contentType: 'text',
      conversationId: session.get('conversation').id,
      deliveryType: 'respectful',
      metadata: {
        automated,
        copyRevision: Number(
          session.get('messagingRevision') || messaging.revision || 0,
        ),
        guideSource: session.get('guideSource'),
        onboarding: true,
        onboardingStep: turn.step,
        suppressBot: true,
        suppressPush: true,
        suppressReveal: true,
        suppressUnread: true,
        turnKey: turn.key,
      },
      text: turn.text,
    },
    {
      context: sideEffectSuppression,
      trustedOnboardingMetadata: true,
    },
  );
};

const serializeTurn = message => ({
  authorId: getObjectId(message.get('author')),
  clientMessageId: message.get('clientMessageId'),
  contentType: message.get('contentType') || 'text',
  createdAt: message.createdAt ? message.createdAt.toISOString() : null,
  metadata: message.get('metadata') || {},
  objectId: message.id,
  text: message.get('text') || '',
});

const getPersistedTurns = async session => {
  const messages = await new Parse.Query(MESSAGING_CLASSES.MESSAGE)
    .equalTo('conversation', session.get('conversation'))
    .notEqualTo('isDeleted', true)
    .ascending('createdAt')
    .addAscending('objectId')
    .limit(1000)
    .find(masterOptions);
  return messages
    .filter(message => (message.get('metadata') || {}).onboarding === true)
    .map(serializeTurn);
};

export const sessionSummary = async session => ({
  completed: session.get('completed') === true,
  conversationId: getObjectId(session.get('conversation')),
  guideSource: session.get('guideSource'),
  guideUserId: getObjectId(session.get('guide')),
  messagingRevision: Number(session.get('messagingRevision') || 0),
  onboardingSessionId: session.id,
  // Authenticated resume state only. This value is never written to a Message
  // and is cleared immediately after a successful OTP commit.
  pendingPhoneNumber: session.get('pendingPhoneNumber') || undefined,
  reachedStep: session.get('reachedStep'),
  turns: await getPersistedTurns(session),
});

const finalizationLeaseQuery = session =>
  new Parse.Query(ONBOARDING_FINALIZATION_LEASE_CLASS).equalTo(
    'leaseKey',
    `session:${session.id}`,
  );

export const acquireFinalizationLease = async (
  session,
  user,
  retryCount = 0,
) => {
  if (retryCount > 2) {
    throw new OnboardingSessionServiceError(
      'Unable to acquire onboarding finalization lease.',
    );
  }
  const token = uuidv4();
  const lease = new Parse.Object(ONBOARDING_FINALIZATION_LEASE_CLASS);
  lease.set('leaseKey', `session:${session.id}`);
  lease.set('session', session);
  lease.set('user', user);
  lease.set('state', 'active');
  lease.set('token', token);
  lease.set(
    'expiresAt',
    new Date(Date.now() + finalizationLeaseMilliseconds),
  );
  lease.setACL(buildSessionACL(user));
  try {
    return await lease.save(null, masterOptions);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const existing = await finalizationLeaseQuery(session).first(masterOptions);
    if (!existing) throw error;
    if (
      existing.get('state') === 'completed' &&
      session.get('completed') === true
    ) {
      return existing;
    }
    const expiresAt = existing.get('expiresAt');
    if (expiresAt instanceof Date && expiresAt > new Date()) {
      throw new OnboardingSessionServiceError(
        'Onboarding finalization is already in progress.',
      );
    }
    await existing.destroy(masterOptions);
    return acquireFinalizationLease(session, user, retryCount + 1);
  }
};

export const assertFinalizationLease = async lease => {
  const current = await new Parse.Query(ONBOARDING_FINALIZATION_LEASE_CLASS).get(
    lease.id,
    masterOptions,
  );
  const expiresAt = current.get('expiresAt');
  if (
    current.get('state') !== 'active' ||
    current.get('token') !== lease.get('token') ||
    !(expiresAt instanceof Date) ||
    expiresAt <= new Date()
  ) {
    throw new OnboardingSessionServiceError(
      'The onboarding finalization lease is no longer active.',
    );
  }
  return current;
};

export const completeFinalizationLease = async lease => {
  if (lease.get('state') === 'completed') return lease;
  await assertFinalizationLease(lease);
  lease.set('state', 'completed');
  lease.set('completedAt', new Date());
  lease.unset('expiresAt');
  return lease.save(null, masterOptions);
};

export const releaseFinalizationLease = async lease => {
  if (!lease || !lease.id || lease.get('state') === 'completed') return;
  try {
    const current = await new Parse.Query(
      ONBOARDING_FINALIZATION_LEASE_CLASS,
    ).get(lease.id, masterOptions);
    if (
      current.get('state') === 'active' &&
      current.get('token') === lease.get('token')
    ) {
      await current.destroy(masterOptions);
    }
  } catch (error) {
    if (error.code !== Parse.Error.OBJECT_NOT_FOUND) throw error;
  }
};

export const syncOnboardingConversation = async (
  user,
  params = {},
) => {
  let session = await getSessionForUser(user);
  if (!session) {
    throw new OnboardingSessionServiceError(
      'No onboarding session exists for this user.',
    );
  }
  session = await provisionSessionConversation(session, user);
  let messaging;
  const documentJSON = session.get('messagingDocumentJSON');
  try {
    messaging = documentJSON
      ? resolveMessagingDocument(
        JSON.parse(documentJSON),
        params.locale || session.get('locale'),
      )
      : await loadMessaging(params.locale || session.get('locale'));
  } catch (error) {
    messaging = await loadMessaging(params.locale || session.get('locale'));
  }
  const reachedStep = deriveReachedStep(user, session);
  const turns = buildReachedTurns(user, session, messaging, reachedStep);
  // Sequential writes preserve the intended Time Machine order.
  // eslint-disable-next-line no-restricted-syntax
  for (const turn of turns) {
    // eslint-disable-next-line no-await-in-loop
    await persistTurn(session, messaging, turn);
  }
  session.set('locale', messaging.locale);
  if (!session.get('messagingDocumentJSON')) {
    session.set('messagingRevision', messaging.revision);
    session.set(
      'messagingDocumentJSON',
      JSON.stringify(messaging.document),
    );
  }
  session.set('reachedStep', reachedStep);
  await session.save(null, masterOptions);
  return sessionSummary(session);
};

const finalizeMoment = async (session, user) => {
  const moment = session.get('moment');
  const guide = session.get('guide');
  await ConnectionService.createConnection(
    guide,
    user,
    STATUS_ACCEPTED,
  );
  const commentConversation = await new Parse.Query(
    MESSAGING_CLASSES.CONVERSATION,
  )
    .equalTo('contextKey', `moment:${moment.id}`)
    .first(masterOptions);
  if (commentConversation) {
    await addConversationMembers(commentConversation.get('creator'), {
      conversationId: commentConversation.id,
      memberIds: [user.id],
    });
  }
};

export const finalizeSessionContext = async (session, user) => {
  await revalidateSessionContext(session, user);
  const contextType = session.get('contextType');
  if (contextType === 'reservation') {
    await ReservationService.handleReservation(
      session.get('contextObjectId'),
      user,
    );
  } else if (contextType === 'pass') {
    await PassService.handlePass(
      session.get('contextObjectId'),
      user,
      { conversation: session.get('conversation') },
    );
  } else if (contextType === 'moment') {
    await finalizeMoment(session, user);
  } else {
    await ConnectionService.createConnection(
      session.get('guide'),
      user,
      STATUS_ACCEPTED,
    );
  }
};

export const completeOnboardingSession = async session => {
  // Repair externally visible state first. The durable completed marker is the
  // final write so a retry always re-enters and repairs partial completion.
  await hideHumanGuideMembership(session, false);
  await setConversationOnboardingState(
    session.get('conversation'),
    session,
    'completed',
  );
  session.set('completed', true);
  session.set('completedAt', session.get('completedAt') || new Date());
  session.set('reachedStep', ONBOARDING_STEPS.COMPLETED);
  await session.save(null, masterOptions);
  return session;
};

const clearPendingVerification = session => {
  session.unset('pendingPhoneNumber');
  session.unset('pendingVerificationSentAt');
  session.unset('pendingVerificationStatus');
  session.unset('pendingVerificationToken');
  session.unset('pendingVerificationVerifiedAt');
};

const invalidateOnboardingTurns = async session => {
  const previousTurns = await new Parse.Query(MESSAGING_CLASSES.MESSAGE)
    .equalTo('conversation', session.get('conversation'))
    .notEqualTo('isDeleted', true)
    .limit(1000)
    .find(masterOptions);
  const invalidatedTurns = previousTurns.filter(
    message => (message.get('metadata') || {}).onboarding === true,
  );
  invalidatedTurns.forEach(message => {
    message.set('isDeleted', true);
    message.set('metadata', {
      ...(message.get('metadata') || {}),
      invalidated: true,
    });
  });
  if (invalidatedTurns.length) {
    await Parse.Object.saveAll(invalidatedTurns, {
      ...masterOptions,
      context: sideEffectSuppression,
    });
  }
};

const assertRestartEligible = session => {
  if (!session || session.get('completed')) {
    throw new OnboardingSessionServiceError(
      'Verification can only be restarted during onboarding.',
    );
  }
};

export const beginVerificationRestart = async (user, phoneNumber) => {
  const session = await getSessionForUser(user);
  assertRestartEligible(session);
  await revalidateSessionContext(session, user);
  if (
    user.get('smsVerificationStatus') === 'approved' &&
    user.get('phoneNumber') === phoneNumber
  ) {
    throw new OnboardingSessionServiceError(
      'The new phone number must be different from the verified number.',
    );
  }
  const now = new Date();
  const lastRequestedAt = session.get('verificationRestartRequestedAt');
  if (
    lastRequestedAt instanceof Date &&
    now.getTime() - lastRequestedAt.getTime() <
      verificationRestartCooldownMilliseconds
  ) {
    throw new OnboardingSessionServiceError(
      'Please wait before requesting another verification code.',
    );
  }
  const existingWindowStart = session.get('verificationRestartWindowStartedAt');
  const withinWindow =
    existingWindowStart instanceof Date &&
    now.getTime() - existingWindowStart.getTime() <
      verificationRestartWindowMilliseconds;
  const requestCount = withinWindow
    ? Number(session.get('verificationRestartRequestCount') || 0)
    : 0;
  if (requestCount >= verificationRestartMaximumPerWindow) {
    throw new OnboardingSessionServiceError(
      'Too many verification restarts. Try again later.',
    );
  }
  session.set('pendingPhoneNumber', phoneNumber);
  session.set('pendingVerificationStatus', 'requesting');
  session.set('pendingVerificationToken', uuidv4());
  session.set('reachedStep', ONBOARDING_STEPS.VERIFICATION);
  session.set('verificationRestartRequestCount', requestCount + 1);
  session.set('verificationRestartRequestedAt', now);
  session.set(
    'verificationRestartWindowStartedAt',
    withinWindow ? existingWindowStart : now,
  );
  await session.save(null, masterOptions);
  return session;
};

export const markVerificationRestartSent = async (session, status) => {
  assertRestartEligible(session);
  session.set('pendingVerificationSentAt', new Date());
  session.set('pendingVerificationStatus', status || 'pending');
  await session.save(null, masterOptions);
  return session;
};

export const cancelVerificationRestart = async (session, user) => {
  clearPendingVerification(session);
  session.set('reachedStep', deriveReachedStep(user, session));
  await session.save(null, masterOptions);
  return session;
};

export const markVerificationRestartVerified = async session => {
  assertRestartEligible(session);
  if (!session.get('pendingPhoneNumber')) {
    throw new OnboardingSessionServiceError(
      'No pending phone verification exists.',
    );
  }
  session.set('pendingVerificationStatus', 'verified');
  session.set('pendingVerificationVerifiedAt', new Date());
  await session.save(null, masterOptions);
  return session;
};

export const commitVerificationRestart = async (user, session) => {
  assertRestartEligible(session);
  const phoneNumber = session.get('pendingPhoneNumber');
  const token = session.get('pendingVerificationToken');
  if (
    !phoneNumber ||
    !token ||
    session.get('pendingVerificationStatus') !== 'verified'
  ) {
    throw new OnboardingSessionServiceError(
      'The pending phone number has not been verified.',
    );
  }
  const owner = await new Parse.Query(Parse.User)
    .equalTo('phoneNumber', phoneNumber)
    .notEqualTo('objectId', user.id)
    .first(masterOptions);
  if (owner) {
    throw new OnboardingSessionServiceError(
      'That phone number belongs to another account.',
    );
  }
  user.set('phoneNumber', phoneNumber);
  user.set('smsVerificationStatus', 'approved');
  user.unset('givenName');
  user.unset('familyName');
  user.unset('smallImage');
  await user.save(null, masterOptions);
  await invalidateOnboardingTurns(session);
  if (session.get('lastCommittedVerificationToken') !== token) {
    session.increment('attempt', 1);
    session.set('lastCommittedVerificationToken', token);
  }
  clearPendingVerification(session);
  session.set('reachedStep', ONBOARDING_STEPS.NAME);
  session.set('verificationRestartedAt', new Date());
  await session.save(null, masterOptions);
  return session;
};

export default {
  completeOnboardingSession,
  beginVerificationRestart,
  cancelVerificationRestart,
  commitVerificationRestart,
  deriveReachedStep,
  ensureOnboardingSession,
  finalizeSessionContext,
  getSessionForUser,
  isUserOnboardingComplete,
  markVerificationRestartSent,
  markVerificationRestartVerified,
  sessionSummary,
  syncOnboardingConversation,
};
