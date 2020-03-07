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

});
