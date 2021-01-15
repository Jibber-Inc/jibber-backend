// Providers
// Vendor
import hat from 'hat';
import uuidv4 from 'uuid/v4';
import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
// Utils
import generatePassword from '../utils/generatePassword';

class UserServiceError extends ExtendableError {}

/**
 * Create a new user.
 * @param {String} phoneNumber
 * @param {String} authCode optional
 * @returns {Promise->Parse.User}
 */
const createUser = async (phoneNumber, installationId) => {
  // Phone number argument is required
  if (!phoneNumber) {
    throw new UserServiceError('[5qlkGfPY] Phone number is required');
  }

  const newUser = new Parse.User();
  newUser.setUsername(uuidv4());
  const hashcode = hat();
  newUser.setPassword(generatePassword(hashcode));

  const userAttributes = {
    phoneNumber,
    language: 'en',
    hashcode,
  };
  if (!installationId) {
    return newUser.save(userAttributes, { useMasterKey: true });
  }
  return Parse.User.signUp(
    newUser.get('username'),
    newUser.get('password'),
    userAttributes,
    {
      installationId,
      useMasterKey: true,
    },
  );
};

/**
 * Find last user session based on installation id.
 *
 * @param {Parse.User} user
 * @param {string} installationId
 */
const getLastSessionToken = async (user, installationId) => {
  const query = new Parse.Query(Parse.Session);
  query.equalTo('user', user);
  query.equalTo('installationId', installationId);
  query.descending('updatedAt');
  const session = await query.first({ useMasterKey: true });
  return session ? session.get('sessionToken') : undefined;
};

/**
 * Clear all user sessions
 *
 * @param {Parse.User} user
 */
const clearUserSessions = async user => {
  const query = new Parse.Query(Parse.Session);
  query.equalTo('user', user);
  const sessions = await query.find({ useMasterKey: true });
  const promises = sessions.map(session =>
    session.destroy({ useMasterKey: true }),
  );
  const sessionsCleared = await Promise.all(promises);
  return { sessions: sessionsCleared.map(s => s.get('sessionToken')) };
};

/**
 * Deletes all user installations instances
 *
 * @param {Parse.User} user
 */
const deleteUserInstallations = async user => {
  try {
    const query = new Parse.Query(Parse.Installation);
    query.equalTo('userId', user.id);
    const installations = await query.find({ useMasterKey: true });
    await Promise.all(
      installations.map(installation =>
        installation.destroy({ useMasterKey: true }),
      ),
    );
  } catch (error) {
    throw new UserServiceError(error.message);
  }
};

/**
 * Delete all user rituals.
 *
 * @param {Parse.User} user
 */
const deleteRituals = async user => {
  try {
    if (user.get('ritual')) {
      const ritual = await user.get('ritual').fetch();
      await ritual.destroy({ useMasterKey: true });
    }
  } catch (error) {
    throw new UserServiceError(error.message);
  }
};

/**
 * Delete all user connections
 *
 * @param {Parse.User} user
 */
const deleteConnections = async user => {
  try {
    const fromQuery = new Parse.Query('Connection').equalTo('from', user);
    const toQuery = new Parse.Query('Connection').equalTo('to', user);
    const mainQuery = Parse.Query.or(fromQuery, toQuery);
    const results = await mainQuery.find({ useMasterKey: true });
    if (results) {
      await Promise.all(
        results.map(conn => conn.destroy({ useMasterKey: true })),
      );
    }
  } catch (error) {
    throw new UserServiceError(error.message);
  }
};

/**
 * Delete all user reservations
 *
 * @param {Parse.User} user
 */
const deleteReservations = async user => {
  try {
    const query = new Parse.Query('Reservation').equalTo('createdBy', user);
    const results = await query.find({ useMasterKey: true });
    if (results) {
      await Promise.all(
        results.map(res => res.destroy({ useMasterKey: true })),
      );
    }
  } catch (error) {
    throw new UserServiceError(error.message);
  }
};

export default {
  createUser,
  getLastSessionToken,
  clearUserSessions,
  deleteUserInstallations,
  deleteRituals,
  deleteConnections,
  deleteReservations,
};
