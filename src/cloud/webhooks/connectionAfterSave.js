import Parse from '../../providers/ParseProvider';

class ConnectionAfterSaveError extends ExtendableError {}

/**
 * After save webhook for Connection objects.
 * @param {Object} request
 */
const connectionAfterSave = async request => {
  const connection = request.object; // eslint-disable-line no-unused-vars

  if (connection.isNew()) {
    // Add save calls to the promises array
    const promises = [];

    //Add the connection object to the "toUser" and "fromUser" connections array
    if (!connection.get('toUser')) {
      const toUser = connection.toUser;
      toUser.addUnique('connections', connection);
      promises.push(toUser.save());
    }

    if (!connection.get('fromUser')) {
      const fromUser = connection.fromUser;
      fromUser.addUnique('connections', connection);
      promises.push(fromUser.save());
    }

    Promise.all(promises);
  }
};

export default connectionAfterSave;
