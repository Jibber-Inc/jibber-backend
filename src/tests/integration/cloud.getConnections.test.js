import Parse from '../../providers/ParseProvider';
import { makeUser, makeConnection } from '../setup/seedDB';



describe('test getConnections cloud function', () => {


  /** case: user1 has made two (2) outgoing connections */
  it('getConnectionsService returns correct number of connections', async done => {
    expect.assertions(2);

    // Seed connections
    const user1 = await makeUser();
    const user2 = await makeUser();
    const user3 = await makeUser();
    await makeConnection(user2, user1);
    await makeConnection(user3, user1);

    const options = { sessionToken: user1.getSessionToken() };
    return Parse.Cloud
      .run('getConnections', null, options)
      .then(response => {
        expect(response.from.length).toBe(2);
        expect(response.to.length).toBe(0);
        done();
      });
  });
});

