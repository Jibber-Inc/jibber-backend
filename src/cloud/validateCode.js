import Parse from '../providers/ParseProvider';
import stripPhoneNumber from '../utils/stripPhoneNumber';
import passwordGenerator from '../utils/passwordGenerator';


const validateCode = async request => {
  let phoneNumber = request.params.phoneNumber;
  const authCode = request.params.authCode;

  // Phone number is required in request body
  if (!phoneNumber) {
    throw new Error('No phone number provided in request');
  }

  // Auth code is required in request body
  if (!authCode) {
    throw new Error('No auth code provided in request');
  }

  // Strip phone number
  phoneNumber = stripPhoneNumber(phoneNumber);

  // Build query
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('phoneNumber', phoneNumber);

  // Query for user
  return userQuery
    .first({ useMasterKey: true })
    .then(function(user) {

      // Login user
      return Parse.User.logIn(user.getUsername(), passwordGenerator(authCode));

    })
    .then(function(user) {

      // User not found
      if (!user) {
        throw new Error('User not found');
      }

      return user.getSessionToken();
    });
};


export default validateCode;
