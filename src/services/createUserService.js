// Vendor
import uuidv4 from 'uuid/v4';
import ExtendableError from 'extendable-error-class';

// Providers
import Parse from '../providers/ParseProvider';

// Utils
import passwordGenerator from '../utils/passwordGenerator';
import generateAuthCode from '../utils/generateAuthCode';

class CreateUserError extends ExtendableError {}



/**
 * Create a new user.
 * @param {String} phoneNumber
 * @param {String} authCode optional
 * @returns {Promise->Parse.User}
 */
const createUser = async (phoneNumber, authCode) => {

  // Phone number argument is required
  if (!phoneNumber) {
    throw new CreateUserError('[5qlkGfPY] Phone number is required');
  }

  const newUser = new Parse.User();

  // Set access level
  let acl = new Parse.ACL();
  acl.setPublicReadAccess(true);
  newUser.setACL(acl);

  // Set username, password, phone number, and default language
  newUser.setUsername(uuidv4());
  newUser.setPassword(passwordGenerator(authCode || generateAuthCode()));
  newUser.set('phoneNumber', phoneNumber);
  newUser.set('language', 'en');

  return newUser.signUp();
};


export default createUser;
