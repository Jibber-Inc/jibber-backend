// Vendor modules
import ExtendableError from 'extendable-error-class';

// Providers
import Parse from '../providers/ParseProvider';

// Services
import initiate2FAService from '../services/initiate2FAService';
import createUserService from '../services/createUserService';

// Utils
import stripPhoneNumber from '../utils/stripPhoneNumber';
import generateAuthCode from '../utils/generateAuthCode';
import generatePassword from '../utils/generatePassword';


class SendCodeError extends ExtendableError {}


/**
 * Initiate 2-Factor Authentication for given phone number
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

  // If user exists, update their password
  if (!!user) {
    user.setPassword(generatePassword(authCode));
    user = await user.save(null, { useMasterKey: true })
      .then(user => {
        if (!Boolean(user instanceof Parse.User)) {
          throw new SendCodeError(
            '[z0KveYVV] expected instanceof Parse.User'
          );
        }
        return user;
      });

  // If no user exists, create one
  } else {
    user = await createUserService(phoneNumber, authCode)
      .then(user => {
        if (!Boolean(user instanceof Parse.User)) {
          throw new SendCodeError(
            '[8SzSfMKC] expected instanceof Parse.User'
          );
        }
        return user;
      });
  }

  // Send the code to the phone number
  initiate2FAService(authCode, user);

  // Do not return auth code in the response!!
};



export default sendCode;
