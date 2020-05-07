// Providers
import Parse from '../providers/ParseProvider';
// Vendor
import hat from 'hat';
import uuidv4 from 'uuid/v4';
import ExtendableError from 'extendable-error-class';
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
    return await newUser.save(userAttributes, { useMasterKey: true });
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

const getLastSessionToken = async (user, installationId) => {
  const query = new Parse.Query(Parse.Session);
  query.equalTo('user', user);
  query.equalTo('installationId', installationId);
  query.descending('updatedAt');
  const session = await query.first({ useMasterKey: true });
  return session ? session.get('sessionToken') : undefined;
};

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

const deleteUserInstallations = async user => {
  const query = new Parse.Query(Parse.Installation);
  query.equalTo('userId', user.id);
  const installations = await query.find({ useMasterKey: true });
  const cleared = await Promise.all(
    installations.map(installation =>
      installation.destroy({ useMasterKey: true }),
    ),
  );
  return { installations: cleared.map(i => i.id) };
};

const deleteRoutines = async user => {
  try {
    if (user.get('routine')) {
      const routine = await user.get('routine').fetch();
      await routine.destroy({ useMasterKey: true });
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
  deleteRoutines,
};
