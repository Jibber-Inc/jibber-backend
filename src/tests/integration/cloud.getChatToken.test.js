import Parse from '../../providers/ParseProvider';
import { makeUser } from '../setup/seedDB';
import { isJWT } from 'validator';


describe('test cloud function /getChatToken', () => {

  /** case: no user in request */
  it('should return error if no request.user', async done => {
    expect.assertions(2);
    return Parse.Cloud
      .run('getChatToken')
      .catch(error => {
        expect(error.message).toBe('[q3TZJ1y2] request.user is invalid.');
        expect(error.code).toBe(141);
        done();
      });
  });


  /** case: should return token if valid request */
  it('should return token if valid request', async done => {
    expect.assertions(1);

    // Seed connection from 2 users
    const user = await makeUser();

    // Make connection with cloud function
    const options = { sessionToken: user.getSessionToken() };
    return Parse.Cloud
      .run('getChatToken', null, options)
      .then(response => {
        expect(isJWT(response)).toBe(true);
        done();
      });
  });

});
