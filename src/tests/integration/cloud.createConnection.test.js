import Parse from '../../providers/ParseProvider';
import { makeUser, makeConnection } from '../setup/seedDB';


describe('test cloud function /createConnection', () => {

  /** case: no user in request */
  it('should return error if no request.user', async done => {
    expect.assertions(2);
    return Parse.Cloud
      .run('createConnection')
      .catch(error => {
        expect(error.message).toBe('[2wMux0QT] request.user is invalid.');
        expect(error.code).toBe(141);
        done();
      });
  });


  /** case: no phone number sent */
  it('should return error if no given phoneNumber', async done => {
    expect.assertions(2);
    const user = await makeUser();
    const data = {};
    const options = { sessionToken: user.getSessionToken() };
    return Parse.Cloud
      .run('createConnection', data, options)
      .catch(error => {
        expect(error.message)
          .toBe('[ubSM6Dzb] No phone number provided in request');
        expect(error.code).toBe(141);
        done();
      });
  });


  /** case: no matching user to given phone number */
  it('should return error if phoneNumber not linked to user ', async done => {
    expect.assertions(2);
    const user = await makeUser();
    const data = { phoneNumber: '15099876543' }; // user seeder phoneNumber area code is always 206
    const options = { sessionToken: user.getSessionToken() };
    return Parse.Cloud
      .run('createConnection', data, options)
      .catch(error => {
        expect(error.message).toBe('[sYydNsZl] Target user not found');
        expect(error.code).toBe(141);
        done();
      });
  });


  /** case: connection to target user exists */
  it('should return connection if it exists', async done => {
    expect.assertions(2);

    // Get Connection schema
    const Connection = Parse.Object.extend('Connection');

    // Seed connection from 2 users
    const user1 = await makeUser();
    const user2 = await makeUser();
    const connection = await makeConnection(user2, user1);

    // Make connection with cloud function
    const data = { phoneNumber: user2.get('phoneNumber') };
    const options = { sessionToken: user1.getSessionToken() };
    return Parse.Cloud
      .run('createConnection', data, options)
      .then(response => {
        expect(response.id).toBe(connection.id);
        expect(response instanceof Connection).toBe(true);
        done();
      });
  });



  /** case: target user found and connection to user does not exist */
  it('should return new connection if user found and no existing connection', async done => {
    expect.assertions(3);

    // Get Connection schema
    const Connection = Parse.Object.extend('Connection');

    // Seed connection from 2 users
    const user1 = await makeUser();
    const user2 = await makeUser();

    // Make connection with cloud function
    const data = { phoneNumber: user2.get('phoneNumber') };
    const options = { sessionToken: user1.getSessionToken() };
    return Parse.Cloud
      .run('createConnection', data, options)
      .then(response => {
        expect(response instanceof Connection).toBe(true);
        expect(response.get('status')).toBe('invited');
        expect(response.get('phoneNumber')).toBe(user2.get('phoneNumber'));
        done();
      });
  });

});
