import Parse from '../../providers/ParseProvider';
import { makeUser, makeReservation } from '../setup/seedDB';
import createHandle from '../../utils/createHandle';


describe('test userBeforeSave webhook', () => {

  /** case: creating new user */
  it('creates and sets user "handle" field', async done => {
    expect.assertions(1);

    const reservation = await makeReservation();
    const user = await makeUser({ reservation });

    const givenName = user.get('givenName');
    const familyName = user.get('familyName');
    const position = reservation.get('position');

    expect(user.get('handle'))
      .toBe(createHandle(givenName, familyName, position));
    done();

  });


  /** case: new user, reservation.isClaimed === true when saving */
  it('creates and sets user "handle" field when reservation isClaimed is true', async done => {
    expect.assertions(1);

    const reservation = await makeReservation()
      .then(reservation => {
        reservation.set('isClaimed', true);
        return reservation.save();
      });
    const user = await makeUser({ reservation });

    const givenName = user.get('givenName');
    const familyName = user.get('familyName');
    const position = reservation.get('position');

    expect(user.get('handle'))
      .toBe(createHandle(givenName, familyName, position));
    done();

  });

  /** case: new user, reservation.isClaimed === true when saving */
  it('sets reservation. isClaimed on save', async done => {
    expect.assertions(3);

    let code;

    return makeReservation()
      .then(reservation => {
        // Should be false initially
        expect(reservation.get('isClaimed')).toBe(false);
        code = reservation.get('code');
        return makeUser({ reservation });
      })
      .then(user => {
        // Need to query the reservation because user.get('reservation') values
        // are out of sync at this point
        const reservation_query = new Parse.Query('Reservation');
        reservation_query.equalTo('objectId', user.get('reservation').id);
        return reservation_query.first({ useMasterKey: true });
      })
      .then(reservation => {
        // Updated values should match on code and isClaimed should now be true
        expect(reservation.get('code')).toBe(code);
        expect(reservation.get('isClaimed')).toBe(true);
        done();
      });
  });
});
