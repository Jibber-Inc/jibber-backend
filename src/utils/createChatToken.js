import ExtendableError from 'extendable-error-class';
const AccessToken = require('twilio').jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;


export class CreateChatTokenError extends ExtendableError {}


/**
 * createChatToken utility function
 * @param {String} userId
 * @return {String} Jason Web Token
 */
const createChatToken = userId => {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    TWILIO_SERVICE_SID,
  } = process.env;

  if (!TWILIO_ACCOUNT_SID) {
    throw new CreateChatTokenError('[Hr5B+AnF] expected TWILIO_ACCOUNT_SID');
  }
  if (!TWILIO_API_KEY) {
    throw new CreateChatTokenError('[Ot/hJQ6Q] expected TWILIO_API_KEY');
  }
  if (!TWILIO_API_SECRET) {
    throw new CreateChatTokenError('[oa55glNj] expected TWILIO_API_SECRET');
  }
  if (!TWILIO_SERVICE_SID) {
    throw new CreateChatTokenError('[DWLPvwsL] expected TWILIO_SERVICE_SID');
  }
  if (!userId || typeof userId !== 'string') {
    throw new CreateChatTokenError('[KV2wmxfD] expected userId');
  }

  const accessToken = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET
  );
  const chatGrant = new ChatGrant({
    serviceSid: TWILIO_SERVICE_SID,
  });
  accessToken.addGrant(chatGrant);
  accessToken.identity = userId;
  return accessToken.toJwt();
};


export default createChatToken;
