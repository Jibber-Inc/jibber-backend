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


describe('test verify reservation', () => {

  it('should throw error if code not passed to ', async done => {

    const query = new Parse.Query('Reservation');
    const reservation = await query.first();
    console.log({ reservation }, reservation.get('code'));

    // expect.assertions(1);
    // return http.get('http://127.0.0.1:1337/',
    //   response => {
    //     expect(response.statusCode).toBe(200);
    //     done();
    //   });
    done();
  });

});
