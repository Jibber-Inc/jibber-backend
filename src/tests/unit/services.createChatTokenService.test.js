
import Parse from '../../providers/ParseProvider';
import createChatTokenService, { CreateChatTokenError } from '../../services/createChatTokenService';
import { isJWT } from 'validator';


describe('test createChatTokenService utility', () => {

  /** case: no TWILIO_ACCOUNT_SID */
  it('should throw if missing TWILIO_ACCOUNT_SID', () => {
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_ACCOUNT_SID;
    expect(() => createChatTokenService()).toThrow(CreateChatTokenError);
    process.env.TWILIO_ACCOUNT_SID = TWILIO_ACCOUNT_SID;
  });

  /** case: no TWILIO_API_KEY */
  it('should throw if missing TWILIO_API_KEY', () => {
    const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
    delete process.env.TWILIO_API_KEY;
    expect(() => createChatTokenService()).toThrow(CreateChatTokenError);
    process.env.TWILIO_API_KEY = TWILIO_API_KEY;
  });

  /** case: no TWILIO_API_SECRET */
  it('should throw if missing TWILIO_API_SECRET', () => {
    const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
    delete process.env.TWILIO_API_SECRET;
    expect(() => createChatTokenService()).toThrow(CreateChatTokenError);
    process.env.TWILIO_API_SECRET = TWILIO_API_SECRET;
  });

  /** case: no TWILIO_SERVICE_SID */
  it('should throw if missing TWILIO_SERVICE_SID', () => {
    const TWILIO_SERVICE_SID = process.env.TWILIO_SERVICE_SID;
    delete process.env.TWILIO_SERVICE_SID;
    expect(() => createChatTokenService()).toThrow(CreateChatTokenError);
    process.env.TWILIO_SERVICE_SID = TWILIO_SERVICE_SID;
  });

  /** case: no userId */
  it('should throw if missing userID arg', () => {
    expect(() => createChatTokenService()).toThrow(CreateChatTokenError);
  });

  /** case: valid request */
  it('should return a JWT', async done => {
    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.first();
    expect(isJWT(createChatTokenService(user.id))).toBe(true);
    done();
  });

});
