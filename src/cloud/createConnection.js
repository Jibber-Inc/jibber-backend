import Parse from '../providers/ParseProvider';
import stripPhoneNumber from '../utils/stripPhoneNumber';
import ExtendableError from 'extendable-error-class';
import { isMobilePhone } from 'validator';


export class CreateConnectionError extends ExtendableError {}


/**
 * Create a connection
 * @param {*} request
 * @param {*} response
 */
const createConnection = async request => {

  // The target users phone number
  let fromUser = request.user;
  let phoneNumber = request.params.phoneNumber;

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

  const Connection = Parse.Object.extend('Connection');

  // Strip phone number
  phoneNumber = stripPhoneNumber(phoneNumber);

  // Build query to find user with phoneNumber
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('phoneNumber', phoneNumber);

  // Query for user
  let targetUser = await userQuery.first({ useMasterKey: true });

  // Throw if user not found
  if (!Boolean(targetUser instanceof Parse.User)) {
    throw new CreateConnectionError(
      '[sYydNsZl] Target user not found'
    );
  }

  // If target user found
  // Determine if the user already has a connection with the requesting user
  const connectionQuery = new Parse.Query(Connection);
  connectionQuery.equalTo('to', targetUser);
  connectionQuery.equalTo('from', fromUser);
  let connection = await connectionQuery.first({ useMasterKey: true });

  // If there is an existing connection, return it
  if (connection instanceof Connection) {
    return connection;
  }

  // Otherwise create a connection between the users and set the status to invited
  const newConnection = new Connection();
  newConnection.set('to', targetUser);
  newConnection.set('from', fromUser);
  newConnection.set('phoneNumber', phoneNumber);
  newConnection.set('status', 'invited');
  return newConnection.save();
};

export default createConnection;
