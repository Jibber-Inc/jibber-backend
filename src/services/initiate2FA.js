import Twilio from '../providers/TwilioServiceProvider';


/**
 *
 * @param {String} auth_code
 * @param {Parse.User} user
 */
const initiate2FA = (auth_code, user) => {
  return Twilio.messages.create({
    body: `Your code for Benji is: ${ auth_code }`,
    from: '+12012560616',
    to: user.phoneNumber,
  });
};


export default initiate2FA;
