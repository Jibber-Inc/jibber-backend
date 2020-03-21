import Parse from "../../providers/ParseProvider";

class ConnectionAfterSaveError extends ExtendableError {}

/**
 * After save webhook for Connection objects.
 * @param {Object} request
 */
const connectionAfterSave = async request => {
  const connection = request.object; // eslint-disable-line no-unused-vars

  if (connection.isNew()) {
    //Add the connection object to the "toUser" and "fromUser" connections array

    const toUser = connection.toUser;
    toUser.addUnique("connections", connection);

    const fromUser = connection.fromUser;
    fromUser.addUnique("connections", connection);

    Promise.all([fromUser.save(), toUser.save()]);
  }
};

export default connectionAfterSave;
