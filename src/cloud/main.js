// Cloud functions
import sendCode from './sendCode';
import validateCode from './validateCode';

// Environment variables
const {
  BENJI_SECRET_PASSWORD_TOKEN,
} = process.env;


// Don't allow undefined or empty variable for secret password token
if (!BENJI_SECRET_PASSWORD_TOKEN) {
  throw new Error('BENJI_SECRET_PASSWORD_TOKEN must be set');
}


Parse.Cloud.define('sendCode', sendCode);
Parse.Cloud.define('validateCode', validateCode);
Parse.Cloud.define('sendPush', async request => {

  var query = new Parse.Query(Parse.Installation);
  query.equalTo('userId', request.userId);

  return Parse.Push.send({
    where: query,
    data: {
      alert: 'Test',
    }
  }, { useMasterKey: true }).then(() => {
    console.log('Push ok');
  }, (e) => {
    console.log('Push error', e);
  });
});

Parse.Cloud.define('updateConnection', function(request, response) {

  Parse.Cloud.useMasterKey();

  var connectionID = request.params.connectionID;
  var query = new Parse.Query('Connection');

  //get the connection object
  query.get(connectionID, {
    success: function(connection) {
      //get the user the request was from
      var fromUser = connection.get('from');
      //get the user the request is to
      var toUser = connection.get('to');

      var relation = fromUser.relation('connections');
      //add the user the request was to (the accepting user) to the fromUsers friends
      relation.add(toUser);

      //save the fromUser
      fromUser.save(null, {
        success: function() {
          //saved the user, now edit the request status and save it
          connection.set('status', request.params.status);
          connection.save(null, {
            success: function() {
              response.success('saved relation and updated the connection');
            },
            error: function(error) {
              response.error(error);
            }
          });
        },
        error: function(error) {
          response.error(error);
        }
      });
    },
    error: function(error) {
      response.error(error);
    }
  });
});

// /**
//  * verify reservation
//  */
// Parse.Cloud.define('verifyReservation', async request => {
//   let code = request.params.code 
//   //Build query 
//   const query = Parse.Query(Parse.Reservation):
//   query.equalTo('code', code)

//   //Query for reservation
//   let reservation = await query.first({ useMasterKey: true });

//   if (reservation) {
//     if reservation.has('user') {

//       const userQuery = new Parse.Query(Parse.User);
//       userQuery.equalTo('objectId', reservation.user.objectId)
//       //Query for user
//       let user = await userQuery.first({ useMasterKey: true });

//       if (user) {
//         //Send user a verification code code 
//         twilioClient.messages.create({
//           body: `Your code for Benji is: ${ authCode }`,
//           from: '+12012560616',
//           to: user.phoneNumber,
//         });
//       }
//     } 
//   } else {
//     throw new Error('Reservation not found')
//   }

//   return reservation

// }):

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
