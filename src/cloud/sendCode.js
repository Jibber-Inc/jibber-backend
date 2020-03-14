// Vendor modules
import uuidv4 from 'uuid/v4';
import ExtendableError from 'extendable-error-class';

// Providers
import Parse from '../providers/ParseProvider';

// Services
import initiate2FA from '../services/initiate2FA';

// Utils
import stripPhoneNumber from '../utils/stripPhoneNumber';
import generateAuthCode from '../utils/generateAuthCode';
import passwordGenerator from '../utils/passwordGenerator';


class SendCodeError extends ExtendableError {}


/**
 *
 * @param {*} request
 */
const sendCode = async request => {
  let phoneNumber = request.params.phoneNumber;

  // Phone number is required in request body
  if (!phoneNumber) {
    throw new SendCodeError('[Zc1UZev9] No phone number provided in request');
  }

  // Strip phone number
  phoneNumber = stripPhoneNumber(phoneNumber);

  // Build query
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('phoneNumber', phoneNumber);

  // Generate auth code
  const authCode = generateAuthCode();

  // Query for user
  let user = await userQuery.first({ useMasterKey: true });

  if (!!user) {
    user.setPassword(passwordGenerator(authCode));
    user.save(null, { useMasterKey: true })
      .then(user => {

        if (!Boolean(user instanceof Parse.User)) {
          throw new SendCodeError(
            '[z0KveYVV] expected instanceof Parse.User'
          );
        }

        initiate2FA(authCode, user);
      });

  } else {

    // Create a new user
    const newUser = new Parse.User();
    let acl = new Parse.ACL();
    acl.setPublicReadAccess(true);
    newUser.setACL(acl);
    newUser.setUsername(uuidv4());
    newUser.setPassword(passwordGenerator(authCode));
    newUser.set('phoneNumber', phoneNumber);
    newUser.set('language', 'en');
    const user = await newUser.signUp();

    if (!Boolean(user instanceof Parse.User)) {
      throw new SendCodeError(
        '[hRE4DM1d] expected user = instanceof Parse.User'
      );
    }

    initiate2FA(authCode, user);
  }

  // Return the auth code
  return authCode;
};


export default sendCode;
