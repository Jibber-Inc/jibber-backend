// Providers
import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';

import {
  STATUS_ACCEPTED,
  STATUS_CREATED,
  STATUS_DECLINED,
} from '../constants';

class ConnectionServiceError extends ExtendableError { }

const isDuplicateKeyError = error =>
  error && (error.code === 137 || /duplicate key/i.test(error.message));

export const canonicalConnectionKey = (fromUser, toUser) =>
  `connection:${fromUser.id}:${toUser.id}`;

export const beforeSaveConnection = request => {
  const connection = request.object;
  const fromUser = connection.get('from');
  const toUser = connection.get('to');
  if (!fromUser || !fromUser.id || !toUser || !toUser.id) {
    throw new ConnectionServiceError(
      'Connection from and to users are required.',
    );
  }

  const expectedKey = canonicalConnectionKey(fromUser, toUser);
  const suppliedKey = connection.get('canonicalKey');
  const dirtyKeys = connection.dirtyKeys ? connection.dirtyKeys() : [];
  if (
    !request.master &&
    suppliedKey &&
    (!request.original || dirtyKeys.includes('canonicalKey'))
  ) {
    throw new ConnectionServiceError(
      'Connection canonicalKey is server-managed.',
    );
  }
  if (suppliedKey && suppliedKey !== expectedKey) {
    throw new ConnectionServiceError(
      'Connection canonicalKey does not match its users.',
    );
  }
  if (
    request.original &&
    request.original.get('status') === STATUS_DECLINED &&
    connection.get('status') !== STATUS_DECLINED
  ) {
    throw new ConnectionServiceError(
      'A declined connection cannot be reactivated automatically.',
    );
  }
  connection.set('canonicalKey', expectedKey);
};

const assertConnectionMayTransition = (connection, requestedStatus) => {
  if (
    connection &&
    connection.get('status') === STATUS_DECLINED &&
    requestedStatus !== STATUS_DECLINED
  ) {
    throw new ConnectionServiceError(
      'A declined connection cannot be reactivated automatically.',
    );
  }
};

const statusForRetry = (connection, requestedStatus) =>
  connection.get('status') === STATUS_ACCEPTED
    ? STATUS_ACCEPTED
    : requestedStatus;

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
  reservationId = undefined,
) => {
  // Get "Connection" schema
  const Connection = Parse.Object.extend('Connection');
  const connectionKey = canonicalConnectionKey(fromUser, targetUser);

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
    assertConnectionMayTransition(connection, status);
    connection.set('canonicalKey', connectionKey);
    connection.set('status', statusForRetry(connection, status));
    if (reservationId) {
      connection.set('reservation', reservationId);
    }
    return saveConnection(connection, fromUser, targetUser, status);
  }

  // Otherwise create a connection between the users and set the status to invited
  try {
    connection = new Connection();
    connection.set('canonicalKey', connectionKey);
    connection.set('to', targetUser);
    connection.set('from', fromUser);
    connection.set('status', status);
    connection.set('reservation', reservationId);

    try {
      return await saveConnection(connection, fromUser, targetUser, status);
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const duplicate = await new Parse.Query(Connection)
        .equalTo('canonicalKey', connectionKey)
        .first({ useMasterKey: true });
      if (!duplicate) throw error;
      assertConnectionMayTransition(duplicate, status);
      duplicate.set('status', statusForRetry(duplicate, status));
      if (reservationId) duplicate.set('reservation', reservationId);
      return saveConnection(duplicate, fromUser, targetUser, status);
    }
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
  beforeSaveConnection,
  createConnection,
  getConnections,
};
