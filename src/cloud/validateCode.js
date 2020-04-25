import Parse from '../providers/ParseProvider';
import ExtendableError from 'extendable-error-class';
import stripPhoneNumber from '../utils/stripPhoneNumber';
import generatePassword from '../utils/generatePassword';

class ValidateCodeError extends ExtendableError {}

const validateCode = async request => {
  let { phoneNumber } = request.params;
  const { installationId, authCode } = request.params;

  // Phone number is required in request body
  if (!phoneNumber) {
    throw new ValidateCodeError(
      '[JXK8SYA4] No phone number provided in request',
    );
  }

  // Installation Id is required in request body
  if (!installationId) {
    throw new ValidateCodeError(
      '[STK8SYR9] No installationId provided in request',
    );
  }

  // Auth code is required in request body
  if (!authCode) {
    throw new ValidateCodeError('[xDETWSYH] No auth code provided in request');
  }

  // Strip phone number
  phoneNumber = stripPhoneNumber(phoneNumber);

  // Build query
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('phoneNumber', phoneNumber);

  // Query for user
  return userQuery
    .first({ useMasterKey: true })
    .then(user => {
      if (!Boolean(user instanceof Parse.User)) {
        throw new ValidateCodeError('[zIslmc6c] User not found');
      }

      // Login user
      return Parse.User.logIn(user.getUsername(), generatePassword(authCode), {
        installationId,
      });
    })
    .then(user => {
      // User not found
      if (!user) {
        throw new ValidateCodeError('[bJHe2Jgj] User not found');
      }

      return user.getSessionToken();
    });
};

export default validateCode;
