import Parse from '../providers/ParseProvider';
import Twilio from '../providers/TwilioProvider';
import ExtendableError from 'extendable-error-class';
import { isMobilePhone } from 'validator';


export class Inititate2FAError extends ExtendableError {}


/**
 * Given an auth code and instance of Parse.User, send text to the user phone #
 * @param {Number} auth_code
 * @param {Parse.User} user
 */
export const initiate2FA = (auth_code, user) => {

  if (!auth_code || typeof auth_code !== 'string') {
    throw new Inititate2FAError(
      '[HspaCMAg] Invalid auth_code argument'
    );
  }

  if (!Boolean(user instanceof Parse.User)) {
    throw new Inititate2FAError(
      '[w395DBDy] Invalid user argument'
    );
  }

  if (!user.get('phoneNumber')) {
    throw new Inititate2FAError(
      '[qV6Heiv8] Cannot initiate 2FA, no value in user.phoneNumber'
    );
  }

  if (!isMobilePhone(user.get('phoneNumber'))) {
    throw new Inititate2FAError(
      '[SIjXK1Xm] Invalid phone number'
    );
  }

  return new Twilio().client.messages.create({
    body: `Your code for Benji is: ${ auth_code }`,
    from: process.env.TWILIO_PHONE_NUMBER || '+12012560616',
    to: user.get('phoneNumber'),
  });
};


export default initiate2FA;
