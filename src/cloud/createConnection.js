import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import ConnectionService from '../services/ConnectionService';
import PushService from '../services/PushService';
import NoticeService from '../services/NoticeService';
import UserUtils from '../utils/userData';

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

class CreateConnectionError extends ExtendableError { }

const createConnection = async request => {
  const { user } = request;
  const { to, status, reservationId } = request.params;

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
    const userFullName = UserUtils.getFullName(user);

    const connection = await ConnectionService.createConnection(
      user,
      toUser,
      status,
      reservationId
    );

    // Notify the user about the connection request
    if (connection && status === STATUS_INVITED) {

      // Set the data for the connection request Notice object
      const noticeData = {
        type: NOTIFICATION_TYPES.CONNECTION_REQUEST,
        body: `You have a connection request from ${userFullName}.`,
        attributes: {
          connectionId: connection.id,
        },
        priority: 2,
        toUser,
      };
      // Create the Notice object
      await NoticeService.createNotice(noticeData);

      // Set the data for the push notification
      const data = {
        category: 'connectionRequest',
        title: 'Connection Request handshake',
        body: `You have a connection request from ${userFullName}.`,
        connectionId: connection.id,
        target: 'room',
      };

      // Create the push notification
      await PushService.sendPushNotificationToUsers(
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
