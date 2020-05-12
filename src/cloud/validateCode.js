import Parse from '../providers/ParseProvider';
import ExtendableError from 'extendable-error-class';
import generatePassword from '../utils/generatePassword';
import TwoFAService from '../services/TwoFAService';
import UserService from '../services/UserService';
import ReservationService from '../services/ReservationService';

class ValidateCodeError extends ExtendableError {}

const validateCode = async request => {
  let { params, installationId } = request;
  const { phoneNumber, authCode } = params;

  // Phone number is required in request body
  if (!phoneNumber) {
    throw new ValidateCodeError(
      '[JXK8SYA4] No phone number provided in request',
    );
  }

  // Installation Id is required in request body
  if (!installationId) {
    throw new ValidateCodeError(
      '[STK8SYR9] No installationId provided in request header',
    );
  }

  // Auth code is required in request body
  if (!authCode) {
    throw new ValidateCodeError('[xDETWSYH] No auth code provided in request');
  }

  // Build query
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('phoneNumber', phoneNumber);
  const user = await userQuery.first({ useMasterKey: true });

  if (!Boolean(user instanceof Parse.User)) {
    throw new ValidateCodeError('[zIslmc6c] User not found');
  }

  try {
    if (user.get('verificationStatus') !== 'approved') {
      const { status, valid } = await TwoFAService.verifyCode(
        user.get('phoneNumber'),
        authCode,
      );
      if (!valid) {
        throw new ValidateCodeError('[KTN1RYO9] Auth code validation failed');
      }

      user.set('verificationStatus', status);
      user.set('verificationValid', valid);
      await user.save(null, { useMasterKey: true });
      // creates 3 reservations for the new user.
      // TODO: set this number as an app configuration.
      await ReservationService.createReservations(user, 3);
    }

    const sessionToken = await UserService.getLastSessionToken(
      user,
      installationId,
    );
    // If no session token present login the user.
    if (!sessionToken) {
      const logged = await Parse.User.logIn(
        user.getUsername(),
        generatePassword(user.get('hashcode')),
        {
          installationId,
        },
      );
      return logged.getSessionToken();
    }

    return sessionToken;
  } catch (error) {
    throw new ValidateCodeError(`Validation error. Detail: ${error.message}`);
  }
};

export default validateCode;
