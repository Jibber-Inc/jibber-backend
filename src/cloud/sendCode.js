// Vendor modules
import ExtendableError from 'extendable-error-class';
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';
// Providers
import Parse from '../providers/ParseProvider';
// Services
import TwoFAService, { TwoFAServiceError } from '../services/TwoFAService';
import UserService from '../services/UserService';
// Utils
import testUser from '../utils/testUser';

class SendCodeError extends ExtendableError {}

/**
 * Initiate 2-Factor Authentication for given phone number
 * @param {*} request
 */
const sendCode = async request => {
  const { params, installationId } = request;
  const { phoneNumber } = params;

  // Phone number is required in request body
  if (!phoneNumber) {
    throw new SendCodeError('[Zc1UZev9] No phone number provided in request');
  }

  // InstallationId argument is required
  if (!installationId) {
    throw new SendCodeError('[5qlkGfPY] InstallationId is required');
  }

  const phoneUtil = PhoneNumberUtil.getInstance();
  const parsedPhoneNumber = phoneUtil.parse(phoneNumber);

  if (!phoneUtil.isValidNumber(parsedPhoneNumber)) {
    throw new SendCodeError(`Phone number is not valid number`);
  }

  const e164Number = phoneUtil.format(
    parsedPhoneNumber,
    PhoneNumberFormat.E164,
  );

  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('phoneNumber', e164Number);
  let user = await userQuery.first({ useMasterKey: true });

  let locale;
  if (installationId) {
    // Query for Installation instance
    const installation = await new Parse.Query(Parse.Installation)
      .equalTo('installationId', installationId)
      .first({ useMasterKey: true });

    if (installation) {
      const localeIdentifier = installation.get('localeIdentifier');
      if (localeIdentifier) {
        locale = localeIdentifier.substring(0, 2); // i.e: extract "en" from en-US
      }
    }
  }

  try {
    let status;
    if (testUser.isTestUser(phoneNumber)) {
      status = 'pending';
    } else {
      const result = await TwoFAService.sendCode(e164Number, locale);
      status = result.status;
    }
    if (!user) {
      user = await UserService.createUser(e164Number, installationId);
      user.set('status', 'needsVerification');
    }
    user.set('smsVerificationStatus', status);
    await user.save(null, { useMasterKey: true });
    await UserService.asignDefaultRole(user);

    return { status: 'code sent' };
  } catch (error) {
    if (error instanceof TwoFAServiceError) {
      throw new SendCodeError(
        `[Gr6JOan5] Cannot send code to ${phoneNumber}. Detail: ${error.message}`,
      );
    } else {
      throw new SendCodeError(
        `[Fe1K7tw2] An error ocurred on send code to ${phoneNumber}. Detail: ${error.message}`,
      );
    }
  }
};

export default sendCode;
