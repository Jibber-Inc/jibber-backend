// Vendor
import ExtendableError from 'extendable-error-class';

// Providers
import Parse from '../providers/ParseProvider';

// Utils
import stripPhoneNumber from '../utils/stripPhoneNumber';
import { isMobilePhone } from 'validator';

// Services
import createUserService from '../services/createUserService';
import createConnectionService from '../services/createConnectionService';


export class CreateConnectionError extends ExtendableError {}


/**
 * Create a connection
 * @param {*} request
 * @param {*} response
 */
const createConnection = async request => {

  let fromUser = request.user;
  let phoneNumber = request.params.phoneNumber; // The target users phone number

  // "From User" is required
  if (!Boolean(fromUser instanceof Parse.User)) {
    throw new CreateConnectionError(
      '[2wMux0QT] request.user is invalid.'
    );
  }

  // Phone number is required in request body
  if (!phoneNumber) {
    throw new CreateConnectionError(
      '[ubSM6Dzb] No phone number provided in request'
    );
  }

  // Make sure phone number is valid
  if (!isMobilePhone(phoneNumber, 'en-US')) {
    throw new CreateConnectionError(
      '[QEbUz6mr] Invalid phone number'
    );
  }

  // Strip phone number
  phoneNumber = stripPhoneNumber(phoneNumber);

  // Build query to find user with phoneNumber
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('phoneNumber', phoneNumber);

  // Query for user
  let targetUser = await userQuery.first({ useMasterKey: true });

  // If no user exists, create a user with the given phoneNumber
  if (!Boolean(targetUser instanceof Parse.User)) {
    targetUser = await createUserService(phoneNumber);
  }

  return createConnectionService(targetUser, fromUser);
};

export default createConnection;
