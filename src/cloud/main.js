'use strict';


// Vendor modules
const twilio = require('twilio');
const AccessToken = require('twilio').jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;


// Environment variables
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_AUTH_TOKEN,
  TWILIO_SERVICE_SID,
} = process.env;

console.log({
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_AUTH_TOKEN,
  TWILIO_SERVICE_SID,
});


// Build twilio client
const twilioClient = new twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const secretPasswordToken = 'fourScoreAnd7Yearsago';


/**
 * hello
 */
Parse.Cloud.define('hello', request => {
  console.log({ request });
  return 'Hi bitch';
});


/**
 * Upgrading Parse Server to version 3.0.0
 * https://github.com/parse-community/parse-server/blob/master/3.0.0.md
 */


/**
 * createToken
 */
Parse.Cloud.define('createToken', request => {
  const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET);
  const chatGrant = new ChatGrant({ serviceSid: TWILIO_SERVICE_SID });
  token.addGrant(chatGrant);
  token.identity = request.params.phoneNumber;
  return token.toJwt();
});


/**
 * sendCode
 */
Parse.Cloud.define('sendCode', async request => {
  let phoneNumber = request.params.phoneNumber;
  phoneNumber = phoneNumber.replace(/\D/g, '');

  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('username', phoneNumber);

  const min = 1000; const max = 9999;
  const num = Math.floor(Math.random() * (max - min + 1)) + min;

  let user = await userQuery.first({ useMasterKey: true });

  if (user) {
    console.log('Found a user, user is: ' + user.getUsername());
    user.setPassword(secretPasswordToken + num);
    user.save(null, { useMasterKey: true }).then(function() {
      twilioClient.messages.create({
        body: 'Your phone number was just used on the Benji App. Your auth code is: ' + num,
        from: '+12012560616',
        to: phoneNumber
      });
      console.log('Sent the existing user SMS');
    });
  } else {
    console.log('Did not find a user, create and return it');
    const newUser = new Parse.User();
    newUser.setUsername(phoneNumber);
    newUser.setPassword(secretPasswordToken + phoneNumber);
    newUser.set('language', 'en');
    newUser.setACL({});
    await newUser.signUp();

    twilioClient.messages.create({
      body: 'Your phone number was just used on the Benji App. Your auth code is: ' + num,
      from: '+12012560616',
      to: phoneNumber
    });
    console.log('Sent the new user SMS');
    user = newUser;
  }
  console.log('about to return success with num: ' + num);
  return num;
});


/**
 * validateCode
 */
Parse.Cloud.define('validateCode', async request => {
  let phoneNumber = request.params.phoneNumber;
  phoneNumber = phoneNumber.replace(/\D/g, '');

  const authCode = request.params.authCode;
  const password = secretPasswordToken + authCode;

  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('username', phoneNumber);

  const user = await Parse.User.logIn(phoneNumber, password);

  if (user) {
    console.log('User found!');
    return user.getSessionToken();
  } else {
    console.log('User NOT found :(');
    throw new Error('User not found');
  }
});

// Parse.Cloud.define("auth", function(request,response) {
//   const AccessToken = require('twilio').jwt.AccessToken;
//   const ChatGrant = AccessToken.ChatGrant;

//   // Used when generating any kind of tokens
//   const twilioAccountSid = 'AC42c81cfeff3ee6039f1dbd613420c267';
//   const twilioApiKey = 'SK131487ada3e82a4ff4aac7a7cc8bae66';
//   const twilioApiSecret = 'kEyPXBdfRazuzqmSqZAr4i2gcsK3nHlZ';

//   // Used specifically for creating Chat tokens
//   const serviceSid = 'IS2bb5009c33fe480eb948f985d10ca201';
//   const identity = 'wtrambo@gmail.com';

//   // Create a "grant" which enables a client to use Chat as a given user,
//   // on a given device
//   const chatGrant = new ChatGrant({
//     serviceSid: serviceSid,
//   });

//   // Create an access token which we will sign and return to the client,
//   // containing the grant we just created
//   const token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret);

//   token.addGrant(chatGrant);

//   token.identity = identity;

//   // Serialize the token to a JWT string
//   console.log(token.toJwt());
//   response.success(token.toJwt());
// });