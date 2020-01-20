'use strict';

const uuidv4 = require('uuid/v4');

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
  BENJI_SECRET_PASSWORD_TOKEN,
} = process.env;

// Don't allow undefined or empty variable for secret password token
if (!BENJI_SECRET_PASSWORD_TOKEN) {
  throw new Error('BENJI_SECRET_PASSWORD_TOKEN must be set');
}

// Build twilio client
const twilioClient = new twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

/**
 * createChatToken
 */
function createChatToken(objectId) {
  const accessToken = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET);
  const chatGrant = new ChatGrant({ serviceSid: TWILIO_SERVICE_SID });
  accessToken.addGrant(chatGrant);
  accessToken.identity = objectId;
  return accessToken.toJwt();
}

function passwordGenerator(authCode) {
  return `${ BENJI_SECRET_PASSWORD_TOKEN }${ authCode }`;
}

function generateAuthCode() {
  const min = 1000; const max = 9999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function stripPhoneNumber(phoneNumber) {
  return phoneNumber.replace(/\D/g, '');
}

/**
 * sendCode
 */
Parse.Cloud.define('sendCode', async request => {
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
      .then(function() {
        twilioClient.messages.create({
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

    twilioClient.messages.create({
      body: `Your code for Benji is: ${ authCode }`,
      from: '+12012560616',
      to: phoneNumber,
    });
    user = newUser;
  }

  // Return the auth code
  return authCode;
});

/**
 * validateCode
 */
Parse.Cloud.define('validateCode', async request => {
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
});

/**
 * verify reservation
 */
Parse.Cloud.define('verifyReservation', async request => {
  let code = request.params.code 
  //Build query 
  const query = Parse.Query(Parse.Reservation):
  query.equalTo('code', code)

  //Query for reservation
  let reservation = await query.first({ useMasterKey: true });

  if (reservation) {
    if reservation.has('user') {

      const userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo('objectId', reservation.user.objectId)
      //Query for user
      let user = await userQuery.first({ useMasterKey: true });

      if (user) {
        //Send user a verification code code 
        twilioClient.messages.create({
          body: `Your code for Benji is: ${ authCode }`,
          from: '+12012560616',
          to: user.phoneNumber,
        });
      }
    } 
  } else {
    throw new Error('Reservation not found')
  }

  return reservation

}):

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
