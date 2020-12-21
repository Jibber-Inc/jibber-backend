// Providers
import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';

import { STATUS_ACCEPTED } from '../constants';

class ConnectionServiceError extends ExtendableError {}

/**
 * Create a connection between 2 users and return
 * If connection already exists, return it
 *
 * @param {Parse.User} fromUser
 * @param {Parse.User} targetUser
 * @return {Promise->Connection}
 */
const createConnection = async (fromUser, targetUser) => {
  // Get "Connection" schema
  const Connection = Parse.Object.extend('Connection');

  // Query for existing connection
  const connectionQuery = new Parse.Query('Connection');
  connectionQuery.equalTo('to', targetUser);
  connectionQuery.equalTo('from', fromUser);
  let connection = await connectionQuery.first({ useMasterKey: true });

  // If there is an existing connection, return it
  if (connection instanceof Connection) {
    return connection;
  }

  // Otherwise create a connection between the users and set the status to invited
  try {
    connection = new Connection();
    connection.set('to', targetUser);
    connection.set('from', fromUser);
    connection.set('status', STATUS_ACCEPTED);
    return connection.save();
  } catch (error) {
    throw new ConnectionServiceError(error.message);
  }
};

/**
 * Return any Connection objects where the "to" or "from" user is the given user
 * @param {Parse.User} user
 * @returns {Object}
 */
const getConnections = async (user) => {
  if (!(user instanceof Parse.User)) {
    throw new ConnectionServiceError('[29heIw2r] Expected Parse.User');
  }

  // Get Connection schema
  const Connection = Parse.Object.extend('Connection');

  // Query for connections to the user
  const toQuery = new Parse.Query(Connection);
  toQuery.equalTo('to', user);

  // Query for connections from the user
  const fromQuery = new Parse.Query(Connection);
  fromQuery.equalTo('from', user);

  return {
    incoming: await toQuery.find(),
    outgoing: await fromQuery.find(),
  };
};

export default {
  createConnection,
  getConnections,
};
