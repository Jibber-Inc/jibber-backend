import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import ConnectionService from '../services/ConnectionService';
import PushService from '../services/PushService';

// Constants
import {
  STATUS_INVITED,
  STATUS_ACCEPTED,
  STATUS_DECLINED,
  STATUS_PENDING,
  NOTIFICATION_TYPES,
} from '../constants';

const STATUS_LIST = [
  STATUS_INVITED,
  STATUS_ACCEPTED,
  STATUS_DECLINED,
  STATUS_PENDING,
];

class CreateConnectionError extends ExtendableError {}

const createConnection = async request => {
  const { user } = request;
  const { to, status } = request.params;

  if (!to) {
    throw new CreateConnectionError('[t3K7GMD6] Expected to"');
  }

  const toUser = await new Parse.Query('User').get(to);

  if (!(toUser instanceof Parse.User)) {
    throw new CreateConnectionError('[uDA2jPox] To user not found.');
  }

  if (!(user instanceof Parse.User)) {
    throw new CreateConnectionError('[uDA1jPox] Expected request.user');
  }

  if (!status) {
    throw new CreateConnectionError('[t3K7GMD6] Expected "status"');
  }

  if (!STATUS_LIST.includes(status)) {
    throw new CreateConnectionError(
      `[68wCOpBi] status must be one of ${STATUS_LIST}`,
    );
  }

  try {
    const connection = await ConnectionService.createConnection(
      user,
      toUser,
      status,
    );

    // Notify the user about the connection request
    if (connection && status === STATUS_INVITED) {
      const fullName = `${user.get('givenName')} ${user.get('familyName')}`;
      const data = {
        category: 'connectionRequest',
        title: 'Connection Request handshake',
        body: `You have a connection request from ${fullName}.`,
        connectionId: connection.id,
        target: 'channel',
      };
      await PushService.sendPushNotificationToUsers(
        NOTIFICATION_TYPES.CONNECTION_REQUEST,
        data,
        [toUser],
      );
    }

    return connection;
  } catch (error) {
    throw new CreateConnectionError(error.message);
  }
};

export default createConnection;
