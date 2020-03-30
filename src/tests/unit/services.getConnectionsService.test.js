import { makeUser, makeConnection } from '../setup/seedDB';
import getConnectionsService from '../../services/getConnectionsService';


describe('test getConnections service', () => {


  /** case: user1 has made two (2) outgoing connections */
  it('getConnectionsService returns correct number of connections', async done => {
    expect.assertions(6);

    // Seed connections
    const user1 = await makeUser();
    const user2 = await makeUser();
    const user3 = await makeUser();
    await makeConnection(user2, user1);
    await makeConnection(user3, user1);

    const user1Connections = await getConnectionsService(user1);
    const user2Connections = await getConnectionsService(user2);
    const user3Connections = await getConnectionsService(user3);

    expect(user1Connections.to.length).toBe(0);
    expect(user1Connections.from.length).toBe(2);
    expect(user2Connections.to.length).toBe(1);
    expect(user2Connections.from.length).toBe(0);
    expect(user3Connections.to.length).toBe(1);
    expect(user3Connections.from.length).toBe(0);
    done();
  });
});
