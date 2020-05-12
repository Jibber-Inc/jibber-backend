// Vendor modules
import ExtendableError from 'extendable-error-class';
import { TwoFAServiceError } from '../services/TwoFAService';
// Providers
import Parse from '../providers/ParseProvider';

// Services
import TwoFAService from '../services/TwoFAService';
import UserService from '../services/UserService';
import ReservationService from '../services/ReservationService';
import ConnectionService from '../services/ConnectionService';

class SendCodeError extends ExtendableError {}

/**
 * Initiate 2-Factor Authentication for given phone number
 * @param {*} request
 */
const sendCode = async request => {
  const { params, installationId } = request;
  let { phoneNumber, reservationId } = params;
  let reservation;
  // user is claiming for a reservation
  if (reservationId) {
    reservation = await ReservationService.checkReservation(reservationId);
  }

  // Phone number is required in request body
  if (!phoneNumber) {
    throw new SendCodeError('[Zc1UZev9] No phone number provided in request');
  }
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('phoneNumber', phoneNumber);
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
    const { status, valid } = await TwoFAService.sendCode(phoneNumber, locale);
    if (!user) {
      user = await UserService.createUser(phoneNumber, installationId);
    }
    user.set('verificationStatus', status);
    user.set('verificationValid', valid);
    await user.save(null, { useMasterKey: true });

    // set reservation as claimed and create a connection between users
    if (reservation) {
      reservation.set('isClaimed', true);
      reservation.set('user', user);
      await reservation.save(null, { useMasterKey: true });
      const fromUser = reservation.get('createdBy');
      await ConnectionService.createConnection(fromUser, user);
    }

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
