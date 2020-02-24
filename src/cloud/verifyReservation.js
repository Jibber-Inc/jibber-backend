import twilioClient from './twilioClient';
import generateAuthCode from '../utils/generateAuthCode';


/**
 * verify reservation
 */
const verifyReservation = async request => {

  const code = request.params.code;

  // Build query
  const query = Parse.Query(Parse.Reservation);
  query.equalTo('code', code);

  // Query for reservation
  let reservation = await query.first({ useMasterKey: true });

  if (reservation) {
    if (reservation.has('user')) {
      const userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo('objectId', reservation.user.objectId);

      //Query for user
      const user = await userQuery.first({ useMasterKey: true });

      if (user) {

        const auth_code = generateAuthCode();

        // Send user a verification code
        twilioClient.messages.create({
          body: `Your code for Benji is: ${ auth_code }`,
          from: '+12012560616',
          to: user.phoneNumber,
        });
      } else {
        console.log('yo');
      }
    }
  } else {
    throw new Error('Reservation not found');
  }

  return reservation;

};


export default verifyReservation;
