// Vendor
import ExtendableError from 'extendable-error-class';

class ConnectionBeforeSaveError extends ExtendableError {}

/**
 * After save webhook for Connection objects.
 * @param {Object} request
 */
const connectionAfterSave = async request => {
  const connection = request.object;

  if (connection.className !== 'Connection') {
    throw new ConnectionBeforeSaveError(
      '[L4DAuorJ] Expected connection.className to be "Connection"',
    );
  }

  if (!connection.existed()) {
    // this is a new connection
  }
};

export default connectionAfterSave;
