
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
