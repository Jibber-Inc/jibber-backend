import Parse from '../../providers/ParseProvider';
import { makeUser, makeConnection } from '../setup/seedDB';
import { STATUS_ACCEPTED } from '../../constants';


describe('test updateConnection cloud function', () => {

  /** case: user1 updates status of received connection */
  it('should update connection status of received connection', async done => {
    expect.assertions(2);

    const user1 = await makeUser();
    const user2 = await makeUser();
    const connection = await makeConnection(user1, user2);

    // Get Connection schema
    const Connection = Parse.Object.extend('Connection');

    const request_body = {
      connectionId: connection.id,
      status: STATUS_ACCEPTED,
    };
    const options = { sessionToken: user1.getSessionToken() };

    return Parse.Cloud
      .run('updateConnection', request_body, options)
      .then(response => {
        expect(response instanceof Connection).toBe(true);
        expect(response.get('status')).toBe(STATUS_ACCEPTED);
        done();
      })
      .catch(console.log);
  });


  /** case: user1 updates status of sent connection */
  it('should return error if trying to update sent connection', async done => {
    expect.assertions(2);

    const user1 = await makeUser();
    const user2 = await makeUser();
    const connection = await makeConnection(user2, user1);

    const request_body = {
      connectionId: connection.id,
      status: STATUS_ACCEPTED,
    };
    const options = { sessionToken: user1.getSessionToken() };

    return Parse.Cloud
      .run('updateConnection', request_body, options)
      .catch(error => {
        expect(error.message).toBe('[z5oe1hzG] Connections can only be updated by receiving user.');
        expect(error.code).toBe(141);
        done();
      });
  });
});

