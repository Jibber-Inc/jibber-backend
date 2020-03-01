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
 * } 👍
 *
 * IF reservation == code AND reservation.user != NULL {
 *   query for user THEN send verification code to that users phone number
 *   return reservation one code is sent
 * } 👍
 *
 * IF no reservation matches code, return error 👍
 *
 */
import Parse from '../../providers/ParseProvider';
import axios from 'axios';
import { rest_headers } from '../../utils/headers';
import { makeReservation } from '../setup/seedDB';


describe('test cloud function /verifyReservation', () => {

  /** case: no code sent */
  it('should throw if no code in request body', async done => {
    expect.assertions(2);
    return Parse.Cloud.run('verifyReservation', {})
      .catch(error => {
        expect(error.message).toBe('Missing "code" in request body');
        expect(error.code).toBe(141);
        done();
      });
  });


  /** case: reservation code not found */
  it('should throw if reservation code not found', async done => {
    expect.assertions(2);
    return Parse.Cloud.run('verifyReservation', { code: 'JtXzfJQgIIpGFnSga2RxLIaDgSYfRRir' })
      .catch(error => {
        expect(error.message).toBe('Reservation not found');
        expect(error.code).toBe(141);
        done();
      });
  });


  /** case: no code sent -- I actually want this to return 422 but it wont... */
  it('should return 400 response status if no code sent with request to rest api', async done => {
    expect.assertions(1);
    const url = `${process.env.SERVER_URL}/functions/verifyReservation`;
    return axios.post(url, {}, { headers: rest_headers })
      .catch(error => {
        expect(error.response.status).toBe(400);
        done();
      });
  });


  /** case: valid code sent -- no user  */
  it('should return reservation with no user if given valid code', async done => {
    expect.assertions(3);

    // Seed a single reservation
    const position = 69;
    const reservation = await makeReservation(position); // no user

    // Use verifyReservation endpoint to find the reservation
    const params = { code: reservation.get('code') };
    return Parse.Cloud.run('verifyReservation', params)
      .then(response => {
        expect(response.get('code')).toBe(params.code);
        expect(response.get('position')).toBe(position);
        expect(response.get('user')).toBe(undefined);
        return done();
      });
  });


  /** case: valid code send -- with user */
  it('should return reservation and user if given valid code', async done => {
    expect.assertions(3);

    // Get some user
    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.first({ useMasterKey: true });

    // Seed a reservation with a user property
    const position = 70;
    const reservation = await makeReservation(position, user); // with user

    const params = { code: reservation.get('code') };
    return Parse.Cloud.run('verifyReservation', params)
      .then(response => {
        expect(response.get('code')).toBe(params.code);
        expect(response.get('position')).toBe(position);
        expect(response.get('user') instanceof Parse.User).toBe(true);
        return done();
      });
  });
});
