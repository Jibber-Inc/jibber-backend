import ExtendableError from 'extendable-error-class';
import { Start } from 'twilio/lib/twiml/VoiceResponse';

// Providers
import Stream from '../providers/StreamProvider';

const { AccessToken } = require('twilio').jwt;

const { ChatGrant } = AccessToken;

export class CreateChatTokenError extends ExtendableError {}

/**
 * createChatToken utility function
 * @param {String} userId
 * @return {String} Jason Web Token
 */
const createChatToken = userId => {
  const { STREAM_KEY, STREAM_SECRET } = process.env;

  /*if (!STREAM_KEY) {
    throw new CreateChatTokenError('[Hr5B+AnF] expected TWILIO_ACCOUNT_SID');
  }*/
  
  if (!STREAM_KEY) {
    throw new CreateChatTokenError('[Ot/hJQ6Q] expected STREAM_KEY');
  }
  if (!STREAM_SECRET) {
    throw new CreateChatTokenError('[oa55glNj] expected STREAM_SECRET');
  }

  return Stream.client.createToken(userId);

  /* if (!TWILIO_SERVICE_SID) {
    throw new CreateChatTokenError('[DWLPvwsL] expected TWILIO_SERVICE_SID');
  }*/
  /* if (!userId || typeof userId !== 'string') {
    throw new CreateChatTokenError('[KV2wmxfD] expected userId');
  }

  const accessToken = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
  );
  const chatGrant = new ChatGrant({
    serviceSid: TWILIO_SERVICE_SID,
  });
  accessToken.addGrant(chatGrant);
  accessToken.identity = userId;
  return accessToken.toJwt();*/
};

export default createChatToken;
