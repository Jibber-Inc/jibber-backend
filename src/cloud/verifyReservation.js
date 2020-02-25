import twilioClient from './twilioClient';
import generateAuthCode from '../utils/generateAuthCode';
import { ObjectNotFoundError, RequestBodyError } from '../errors';
import Parse from '../services/ParseServiceProvider';


/**
 * verify reservation
 */
const verifyReservation = async request => {

  const code = request.params.code;

  if (!code || typeof code !== 'string') {
    // Doesn't seem to be a way to return custom response status codes and handle
    // exceptions like this gracefully without blowing up the code/error log etc.
    // I want to return a 422 response here but doesn't seem that Parse will let me
    // It seems that Parse just "magically" handles these types of things in cloud
    // code for ex: https://github.com/parse-community/parse-server/issues/5348
    // 😠 Hopefully I am just wrong and there is something I'm missing...
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
