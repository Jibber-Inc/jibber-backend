import ExtendableError from 'extendable-error-class';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import Parse from '../providers/ParseProvider';
import TwoFAService from '../services/TwoFAService';
import { assertConversationOnboardingEnabled } from '../services/OnboardingFeatureService';
import {
  beginVerificationRestart,
  cancelVerificationRestart,
  markVerificationRestartSent,
} from '../services/OnboardingSessionService';
import testUser from '../utils/testUser';

class RestartOnboardingVerificationError extends ExtendableError {}

const normalizePhoneNumber = value => {
  if (!value) {
    throw new RestartOnboardingVerificationError(
      'A phone number is required.',
    );
  }
  const phoneUtil = PhoneNumberUtil.getInstance();
  let parsed;
  try {
    parsed = phoneUtil.parse(value);
  } catch (error) {
    throw new RestartOnboardingVerificationError(
      'Phone number is not valid.',
    );
  }
  if (!phoneUtil.isValidNumber(parsed)) {
    throw new RestartOnboardingVerificationError(
      'Phone number is not valid.',
    );
  }
  return phoneUtil.format(parsed, PhoneNumberFormat.E164);
};

const restartOnboardingVerificationV1 = async request => {
  let session;
  try {
    await assertConversationOnboardingEnabled(request);
    if (!(request.user instanceof Parse.User)) {
      throw new RestartOnboardingVerificationError(
        'Authentication is required.',
      );
    }
    const phoneNumber = normalizePhoneNumber(request.params.phoneNumber);
    // Reserve the bounded restart attempt and verify session/context eligibility
    // before any provider side effect.
    session = await beginVerificationRestart(request.user, phoneNumber);
    const owner = await new Parse.Query(Parse.User)
      .equalTo('phoneNumber', phoneNumber)
      .notEqualTo('objectId', request.user.id)
      .first({ useMasterKey: true });
    if (owner) {
      throw new RestartOnboardingVerificationError(
        'That phone number belongs to another account.',
      );
    }
    let status = 'pending';
    if (!testUser.isTestUser(phoneNumber, request)) {
      const result = await TwoFAService.sendCode(phoneNumber);
      status = result.status;
    }
    await markVerificationRestartSent(session, status);
    return { sent: true };
  } catch (error) {
    if (session && session.get('pendingVerificationStatus') === 'requesting') {
      try {
        await cancelVerificationRestart(session, request.user);
      } catch (cleanupError) {
        // Preserve the original validation/provider failure.
      }
    }
    throw new RestartOnboardingVerificationError(error.message);
  }
};

export default restartOnboardingVerificationV1;
