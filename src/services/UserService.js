// Providers
import Parse from '../providers/ParseProvider';
// Vendor
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
  newUser.setPassword(generatePassword(installationId));
  return Parse.User.signUp(
    newUser.get('username'),
    newUser.get('password'),
    {
      phoneNumber,
      language: 'en',
    },
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

export default {
  createUser,
  getLastSessionToken,
};
