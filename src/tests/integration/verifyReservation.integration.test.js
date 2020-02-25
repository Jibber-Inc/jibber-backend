/**
 * GIVEN: A user has just downloaded the app
 * AND: They have entered a valid reservation code
 * AND: They DO NOT have an existing account
 * THEN: Then they are prompted to enter their phone number
 *
 * - Reservations will be pre made and have a code that is = to the objectId
 * - Reservations may have an attached user
 *
 * IF reservation == code AND reservation.user == NULL {
 *   then return the reservation
 * }
 *
 * IF reservation == code AND reservation.user != NULL {
 *   query for user THEN send verification code to that users phone number
 *   return reservation one code is sent
 * }
 *
 * IF no reservation matches code, return error
 *
 */
import Parse from '../../services/ParseServiceProvider';
import axios from 'axios';
import { rest_headers } from '../../utils/headers';


describe('test verify reservation', () => {

  it('should throw no code in request body', async done => {
    expect.assertions(2);
    return Parse.Cloud.run('verifyReservation')
      .catch(error => {
        expect(error.message).toBe('Missing "code" in request body');
        expect(error.code).toBe(141);
        done();
      });
  });

  /** I actually want this to return 422 but it wont... */
  it('should return 400 bad request from rest api response', async done => {
    expect.assertions(1);
    const url = `${process.env.SERVER_URL}/functions/verifyReservation`;
    return axios.post(url, {}, { headers: rest_headers })
      .catch(error => {
        expect(error.response.status).toBe(400);
        done();
      });
  });

});
