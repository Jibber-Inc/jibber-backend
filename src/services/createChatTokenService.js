import ExtendableError from 'extendable-error-class';

// Providers
import Stream from '../providers/StreamProvider';

export class CreateChatTokenError extends ExtendableError {}

/**
 * createChatToken utility function
 * @param {String} userId
 * @return {String} Jason Web Token
 */
const createChatToken = userId => {
  const { STREAM_KEY, STREAM_SECRET } = process.env;

  if (!STREAM_KEY) {
    throw new CreateChatTokenError('[Ot/hJQ6Q] expected STREAM_KEY');
  }

  if (!STREAM_SECRET) {
    throw new CreateChatTokenError('[oa55glNj] expected STREAM_SECRET');
  }

  return Stream.client.createToken(userId);
};

export default createChatToken;
