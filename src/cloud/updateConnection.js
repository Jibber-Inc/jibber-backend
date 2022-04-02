import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import ChatService from '../services/ChatService';
import PushService from '../services/PushService';
import UserService from '../services/UserService';
import UserUtils from '../utils/userData';

// Constants
import UserStatus from '../constants/userStatus';
import {
  STATUS_INVITED,
  STATUS_ACCEPTED,
  STATUS_DECLINED,
  STATUS_PENDING,
} from '../constants';

const STATUS_LIST = [
  STATUS_INVITED,
  STATUS_ACCEPTED,
  STATUS_DECLINED,
  STATUS_PENDING,
];

class UpdateConnectionError extends ExtendableError { }

const updateConnection = async request => {
  const { user } = request;
  const { connectionId, status } = request.params;

  if (!(user instanceof Parse.User)) {
    throw new UpdateConnectionError('[uDA1jPox] Expected request.user');
  }

  if (!connectionId) {
    throw new UpdateConnectionError('[jJG5bZHv] Expected "connectionId"');
  }

  if (!status) {
    throw new UpdateConnectionError('[t3K7GMD6] Expected "status"');
  }

  if (!STATUS_LIST.includes(status)) {
    throw new UpdateConnectionError(
      `[68wCOpBi] status must be one of ${STATUS_LIST}`,
    );
  }

  // Get "Connection" schema
  const Connection = Parse.Object.extend('Connection');

  // Query for existing connection
  const query = new Parse.Query(Connection);
  const connection = await query.get(connectionId, { useMasterKey: true });

  if (connection.get('to').id !== user.id) {
    throw new UpdateConnectionError(
      '[z5oe1hzG] Connections can only be updated by receiving an user.',
    );
  }

  try {
    // If there is an existing connection, update and return it
    if (connection instanceof Connection) {
      if (
        connection.get('status') !== STATUS_ACCEPTED &&
        status === STATUS_ACCEPTED
      ) {
        const fromUser = connection.get('from');
        const toUser = connection.get('to');
        const conversationId = `conv_${fromUser.id}_${toUser.id}`;
        const conversation = await ChatService.createConversation(
          fromUser,
          conversationId,
          'messaging',
          conversationId,
          [fromUser.id, toUser.id],
        );

        connection.set('status', status);
        fromUser.set('status', UserStatus.USER_STATUS_ACTIVE);

        // Create Users preferences
        await Promise.all([
          connection.save(null, { useMasterKey: true }),
          fromUser.save(null, { useMasterKey: true }),
          UserService.createUserPreference(toUser, fromUser),
          UserService.createUserPreference(fromUser, toUser),
        ]);

        // Notify that the user accepted the connection
        const toFullName = UserUtils.getFullName(toUser);
        const data = {
          category: 'connectionConfirmed',
          title: 'Connection confirmed 🙌',
          body: `You are now connected to ${toFullName}.`,
          conversationId: conversation.cid,
          target: 'conversation',
        };

        await PushService.sendPushNotificationToUsers(
          data,
          [fromUser],
        );
      }
    }
    return connection;
  } catch (error) {
    throw new UpdateConnectionError(error.message);
  }
};

export default updateConnection;
