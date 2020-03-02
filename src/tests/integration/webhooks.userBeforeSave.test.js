import { makeUser, makeReservation } from '../setup/seedDB';
import createHandle from '../../utils/createHandle';


describe('test userBeforeSave webhook', () => {

  it('creates and sets user "handle" field', async done => {

    const reservation = await makeReservation();
    const user = await makeUser({ reservation });

    const givenName = user.get('givenName');
    const familyName = user.get('familyName');
    const position = reservation.get('position');


    expect(user.get('handle'))
      .toBe(createHandle(givenName, familyName, position));
    done();

  });

});
