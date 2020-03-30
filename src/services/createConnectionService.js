// Providers
import Parse from '../providers/ParseProvider';



/**
 * Create a connection between 2 users and return
 * If connection already exists, return it
 * @param {Parse.User} targetUser
 * @param {Parse.User} fromUser
 * @return {Promise->Connection}
 */
const createConnectionService = async (targetUser, fromUser) => {

  // Get "Connection" schema
  const Connection = Parse.Object.extend('Connection');

  // Query for existing connection
  const connectionQuery = new Parse.Query(Connection);
  connectionQuery.equalTo('to', targetUser);
  connectionQuery.equalTo('from', fromUser);
  let connection = await connectionQuery.first({ useMasterKey: true });

  // If there is an existing connection, return it
  if (connection instanceof Connection) {
    return connection;
  }

  // Otherwise create a connection between the users and set the status to invited
  connection = new Connection();
  connection.set('to', targetUser);
  connection.set('from', fromUser);
  connection.set('status', 'invited');
  return connection.save();
};


export default createConnectionService;
