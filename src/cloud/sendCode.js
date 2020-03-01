// Vendor modules
import uuidv4 from 'uuid/v4';

// Services
import Parse from '../providers/ParseServiceProvider';
import Twilio from '../providers/TwilioServiceProvider';

// Utils
import stripPhoneNumber from '../utils/stripPhoneNumber';
import generateAuthCode from '../utils/generateAuthCode';
import passwordGenerator from '../utils/passwordGenerator';

// Services
// @todo
// import phoneVerificationService from '../services/phoneVerificationService';


/**
 *
 * @param {*} request
 */
const sendCode = async request => {
  let phoneNumber = request.params.phoneNumber;

  // Phone number is required in request body
  if (!phoneNumber) {
    throw new Error('No phone number provided in request');
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

  if (user) {
    user.setPassword(passwordGenerator(authCode));
    user.save(null, { useMasterKey: true })
      .then(() => {
        Twilio.messages.create({
          body: `Your code for Benji is: ${ authCode }`,
          from: '+12012560616',
          to: phoneNumber,
        });
      });

  } else {

    // Create a new user
    const newUser = new Parse.User();
    var acl = new Parse.ACL();
    acl.setPublicReadAccess(true);
    newUser.setACL(acl);
    newUser.setUsername(uuidv4());
    newUser.setPassword(passwordGenerator(authCode));
    newUser.set('phoneNumber', phoneNumber);
    newUser.set('language', 'en');
    await newUser.signUp();

    Twilio.messages.create({
      body: `Your code for Benji is: ${ authCode }`,
      from: '+12012560616',
      to: phoneNumber,
    });
    user = newUser;
  }

  // Return the auth code
  return authCode;
};


export default sendCode;
