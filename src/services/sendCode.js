import twilioClient from '../cloud/twilioClient';


/**
 *
 * @param {String} auth_code
 * @param {Parse.User} user
 */
const verifyPhone = (auth_code, user) => {
  return twilioClient.messages.create({
    body: `Your code for Benji is: ${ auth_code }`,
    from: '+12012560616',
    to: user.phoneNumber,
  });
};


export default verifyPhone;