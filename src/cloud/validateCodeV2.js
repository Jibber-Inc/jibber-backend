import ExtendableError from 'extendable-error-class';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import Parse from '../providers/ParseProvider';
import TwoFAService from '../services/TwoFAService';
import UserService from '../services/UserService';
import testUser from '../utils/testUser';
import { validateCodeWithUser } from './validateCode';
import { assertConversationOnboardingEnabled } from '../services/OnboardingFeatureService';
import {
  commitVerificationRestart,
  ensureOnboardingSession,
  getSessionForUser,
  isUserOnboardingComplete,
  markVerificationRestartVerified,
  syncOnboardingConversation,
} from '../services/OnboardingSessionService';
import { loadMessaging } from '../services/OnboardingMessagingService';

class ValidateCodeV2Error extends ExtendableError {}

const normalizePhoneNumber = value => {
  const phoneUtil = PhoneNumberUtil.getInstance();
  let parsed;
  try {
    parsed = phoneUtil.parse(value);
  } catch (error) {
    throw new ValidateCodeV2Error('Phone number is not valid.');
  }
  if (!phoneUtil.isValidNumber(parsed)) {
    throw new ValidateCodeV2Error('Phone number is not valid.');
  }
  return phoneUtil.format(parsed, PhoneNumberFormat.E164);
};

const currentSessionToken = async request => {
  const directToken =
    request.user &&
    typeof request.user.getSessionToken === 'function' &&
    request.user.getSessionToken();
  if (directToken) return directToken;
  return UserService.getLastSessionToken(request.user, request.installationId);
};

const assertPhoneAvailable = async (phoneNumber, user) => {
  const owner = await new Parse.Query(Parse.User)
    .equalTo('phoneNumber', phoneNumber)
    .notEqualTo('objectId', user.id)
    .first({ useMasterKey: true });
  if (owner) {
    throw new ValidateCodeV2Error(
      'That phone number belongs to another account.',
    );
  }
};

const responseForAuthenticatedRestart = async (request, session) => {
  const phoneNumber = normalizePhoneNumber(request.params.phoneNumber);
  const recentlyCommittedAt = session.get('verificationRestartedAt');
  const isCommittedRetry =
    !session.get('pendingPhoneNumber') &&
    request.user.get('phoneNumber') === phoneNumber &&
    request.user.get('smsVerificationStatus') === 'approved' &&
    recentlyCommittedAt instanceof Date &&
    Date.now() - recentlyCommittedAt.getTime() < 5 * 60 * 1000;
  if (isCommittedRetry) {
    const summary = await syncOnboardingConversation(
      request.user,
      request.params,
    );
    const { turns, ...response } = summary;
    return {
      ...response,
      existingUser: false,
      sessionToken: await currentSessionToken(request),
    };
  }
  if (session.get('pendingPhoneNumber') !== phoneNumber) {
    throw new ValidateCodeV2Error(
      'The verification code does not match the pending phone number.',
    );
  }
  if (!request.params.authCode) {
    throw new ValidateCodeV2Error('A verification code is required.');
  }
  await assertPhoneAvailable(phoneNumber, request.user);
  if (session.get('pendingVerificationStatus') !== 'verified') {
    let status;
    if (testUser.isTestUser(phoneNumber, request)) {
      status = testUser.validate(
        request.params.authCode,
        phoneNumber,
        request,
      );
    } else {
      const result = await TwoFAService.verifyCode(
        phoneNumber,
        request.params.authCode,
      );
      status = result.status;
    }
    if (status !== 'approved') {
      throw new ValidateCodeV2Error('Auth code validation failed.');
    }
    await markVerificationRestartVerified(session);
  }
  await commitVerificationRestart(request.user, session);
  const summary = await syncOnboardingConversation(
    request.user,
    request.params,
  );
  const { turns, ...response } = summary;
  return {
    ...response,
    existingUser: false,
    sessionToken: await currentSessionToken(request),
  };
};

const validateCodeV2 = async request => {
  try {
    await assertConversationOnboardingEnabled(request);
    if (request.user instanceof Parse.User) {
      const authenticatedSession = await getSessionForUser(request.user);
      if (!authenticatedSession) {
        throw new ValidateCodeV2Error(
          'No onboarding session exists for this account.',
        );
      }
      return await responseForAuthenticatedRestart(
        request,
        authenticatedSession,
      );
    }
    const { sessionToken, user } = await validateCodeWithUser(request);
    const existingSession = await getSessionForUser(user);
    if (!existingSession && isUserOnboardingComplete(user)) {
      const messaging = await loadMessaging(request.params.locale);
      return {
        completed: true,
        existingUser: true,
        messagingRevision: messaging.revision,
        reachedStep: 'completed',
        sessionToken,
      };
    }

    await ensureOnboardingSession(user, request.params);
    const summary = await syncOnboardingConversation(user, request.params);
    const { turns, ...response } = summary;
    return { ...response, existingUser: false, sessionToken };
  } catch (error) {
    throw new ValidateCodeV2Error(error.message);
  }
};

export default validateCodeV2;
