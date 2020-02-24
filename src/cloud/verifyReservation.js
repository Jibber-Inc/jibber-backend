import twilioClient from './twilioClient';
import generateAuthCode from '../utils/generateAuthCode';
import { RequestBodyError, ObjectNotFoundError } from '../errors';

/**
 * verify reservation
 */
const verifyReservation = async request => {

  const code = request.params.code;

  if (!code || typeof code !== 'string') {
    throw new RequestBodyError('Missing "code" in request body');
  }

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
    throw new ObjectNotFoundError('Reservation not found');
  }

  return reservation;

};


export default verifyReservation;
