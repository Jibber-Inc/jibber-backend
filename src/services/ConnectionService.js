// Providers
import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';

import { STATUS_ACCEPTED, STATUS_CREATED } from '../constants';

class ConnectionServiceError extends ExtendableError { }

const grantMutualProfileReadAccess = async (fromUser, toUser) => {
  const [freshFromUser, freshToUser] = await Promise.all([
    new Parse.Query(Parse.User).get(fromUser.id, { useMasterKey: true }),
    new Parse.Query(Parse.User).get(toUser.id, { useMasterKey: true }),
  ]);

  const fromACL = freshFromUser.getACL() || new Parse.ACL(freshFromUser);
  fromACL.setReadAccess(freshToUser, true);
  freshFromUser.setACL(fromACL);

  const toACL = freshToUser.getACL() || new Parse.ACL(freshToUser);
  toACL.setReadAccess(freshFromUser, true);
  freshToUser.setACL(toACL);

  await Promise.all([
    freshFromUser.save(null, { useMasterKey: true }),
    freshToUser.save(null, { useMasterKey: true }),
  ]);
};

const saveConnection = async (connection, fromUser, toUser, status) => {
  const savedConnection = await connection.save(null, { useMasterKey: true });
  if (status === STATUS_ACCEPTED) {
    await grantMutualProfileReadAccess(fromUser, toUser);
  }
  return savedConnection;
};

/**
 * Create a connection between 2 users and return
 * If connection already exists, return it
 *
 * @param {Parse.User} fromUser
 * @param {Parse.User} targetUser
 * @return {Promise->Connection}
 */
const createConnection = async (
  fromUser,
  targetUser,
  status = STATUS_CREATED,
  reservationId = undefined
) => {
  // Get "Connection" schema
  const Connection = Parse.Object.extend('Connection');

  // Query for existing connection
  const connectionQuery = new Parse.Query('Connection');
  connectionQuery.equalTo('to', targetUser);
  connectionQuery.equalTo('from', fromUser);
  let connection = await connectionQuery.first({ useMasterKey: true });

  // If there is an existing connection, promote it to the requested state.
  // Reservation claims may be retried after a partial onboarding failure, so
  // returning a stale invited connection here would leave the users only
  // partially connected.
  if (connection instanceof Connection) {
    connection.set('status', status);
    if (reservationId) {
      connection.set('reservation', reservationId);
    }
    return saveConnection(connection, fromUser, targetUser, status);
  }

  // Otherwise create a connection between the users and set the status to invited
  try {
    connection = new Connection();
    connection.set('to', targetUser);
    connection.set('from', fromUser);
    connection.set('status', status);
    connection.set('reservation', reservationId);

    return saveConnection(connection, fromUser, targetUser, status);
  } catch (error) {
    throw new ConnectionServiceError(error.message);
  }
};

/**
 * Return any Connection objects where the "to" or "from" user is the given user
 * @param {Parse.User} user
 * @returns {Object}
 */
const getConnections = async user => {
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
