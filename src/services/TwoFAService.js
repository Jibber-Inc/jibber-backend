import Twilio from '../providers/TwilioProvider';
import ExtendableError from 'extendable-error-class';

const { TWILIO_VERIFY_SERVICE_SID } = process.env;

export class TwoFAServiceError extends ExtendableError {}

/**
 * Send auth code to a Parse.User phonenumber
 *
 * @param {Parse.User} user
 * @return {Promise}
 */
const sendCode = async (phoneNumber, locale = undefined) => {
  if (!phoneNumber) {
    throw new TwoFAServiceError(
      '[qV6Heiv8] Cannot initiate 2FA, no phoneNumber provided',
    );
  }
  try {
    const verification = await new Twilio().client.verify
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phoneNumber, channel: 'sms', locale });

    return verification;
  } catch (error) {
    throw new TwoFAServiceError(`[K67TCo5] ${error.message}`);
  }
};

const verifyCode = async (phonenumber, code) => {
  if (!code) {
    throw new TwoFAServiceError('[w396HBSy] No code provided');
  }
  try {
    const verification = await new Twilio().client.verify
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phonenumber, code });
    return verification;
  } catch (error) {
    throw new TwoFAServiceError(`[j816CRx9] ${error.message}`);
  }
};

export default { sendCode, verifyCode };
