import Parse from '../../providers/ParseProvider';
import { makeUser } from '../setup/seedDB';


describe('test cloud function /createConnection', () => {

  /** no phone number sent */
  it('should throw if no request.user', async done => {
    expect.assertions(2);
    return Parse.Cloud
      .run('createConnection')
      .catch(error => {
        expect(error.message)
          .toBe('[2wMux0QT] request.user is invalid.');
        expect(error.code).toBe(141);
        done();
      });
  });

  /** no phone number sent */
  it('should throw if not given phoneNumber', async done => {
    expect.assertions(2);
    const user = await makeUser();
    return Parse.Cloud
      .run('createConnection', {}, { sessionToken: user.getSessionToken() })
      .catch(error => {
        expect(error.message)
          .toBe('[ubSM6Dzb] No phone number provided in request');
        expect(error.code).toBe(141);
        done();
      });
  });

});
