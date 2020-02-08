const AccessToken = require('twilio').jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_SERVICE_SID,
} = process.env;


/**
 * createChatToken
 * @return {String} Jason Web Token
 */
const createChatToken = objectId => {
  const accessToken = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET);
  const chatGrant = new ChatGrant({ serviceSid: TWILIO_SERVICE_SID });
  accessToken.addGrant(chatGrant);
  accessToken.identity = objectId;
  return accessToken.toJwt();
};


export default createChatToken;
