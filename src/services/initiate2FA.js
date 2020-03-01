import Twilio from '../providers/TwilioProvider';


/**
 *
 * @param {String} auth_code
 * @param {Parse.User} user
 */
const initiate2FA = (auth_code, user) => {
  return new Twilio().client.messages.create({
    body: `Your code for Benji is: ${ auth_code }`,
    from: '+12012560616',
    to: user.phoneNumber,
  });
};


export default initiate2FA;
