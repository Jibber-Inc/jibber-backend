import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';

import generatePassword from '../utils/generatePassword';
import TwoFAService from '../services/TwoFAService';
import UserService from '../services/UserService';
import ReservationService from '../services/ReservationService';
// import QuePositionsService from '../services/QuePositionsService';
// Utils
import testUser from '../utils/testUser';
// import db from '../utils/db';

class ValidateCodeError extends ExtendableError { }

const setReservations = async user => {
  const hasReservations = await ReservationService.hasReservations(user);
  if (!hasReservations) {
    // creates 3 reservations for the new user.
    // TODO: set this number as an app configuration.
    await ReservationService.createReservations(user, 3);
  }
};

const validateCode = async request => {
  const { params, installationId } = request;
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

  // Retrieve the user with the phoneNumber
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('phoneNumber', phoneNumber);
  const user = await userQuery.first({ useMasterKey: true });

  if (!(user instanceof Parse.User)) {
    throw new ValidateCodeError('[zIslmc6c] User not found');
  }

  try {
    if (user.get('smsVerificationStatus') !== 'approved') {
      let status;
      if (testUser.isTestUser(phoneNumber)) {
        status = testUser.validate(authCode);
      } else {
        const result = await TwoFAService.verifyCode(
          user.get('phoneNumber'),
          authCode,
        );
        status = result.status;
      }

      // If the code is wrong, user won't be approved
      if (status !== 'approved') {
        throw new ValidateCodeError('[KTN1RYO9] Auth code validation failed');
      }

      user.set('smsVerificationStatus', status);
      await user.save(null, { useMasterKey: true });

      setReservations(user);
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
