import ExtendableError from 'extendable-error-class';
import { isMobilePhone } from 'validator';
import Parse from '../providers/ParseProvider';
import Twilio from '../providers/TwilioProvider';

export class Inititate2FAServiceError extends ExtendableError {}

/**
 * Given an auth code and instance of Parse.User, send text to the user phone #
 * @param {Number} auth_code
 * @param {Parse.User} user
 * @return {Promise}
 */
export const initiate2FAService = (authCode, user) => {
  if (!authCode || typeof authCode !== 'string') {
    throw new Inititate2FAServiceError('[HspaCMAg] Invalid authCode argument');
  }

  if (!(user instanceof Parse.User)) {
    throw new Inititate2FAServiceError('[w395DBDy] Invalid user argument');
  }

  if (!user.get('phoneNumber')) {
    throw new Inititate2FAServiceError(
      '[qV6Heiv8] Cannot initiate 2FA, no value in user.phoneNumber',
    );
  }

  if (!isMobilePhone(user.get('phoneNumber'), 'en-US')) {
    throw new Inititate2FAServiceError('[SIjXK1Xm] Invalid phone number');
  }

  return new Twilio().client.messages.create({
    body: `Your code for Ours is: ${authCode}`,
    from: process.env.TWILIO_PHONE_NUMBER || '+12012560616',
    to: user.get('phoneNumber'),
  });
};

export default initiate2FAService;
