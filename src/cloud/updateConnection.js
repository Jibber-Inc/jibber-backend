import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import ChatService from '../services/ChatService';
import hat from 'hat';

// Constants
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

class UpdateConnectionError extends ExtendableError {}

const updateConnection = async request => {
  const { user } = request;
  const { connectionId, status } = request.params;
  const uniqueId = hat();

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
  const connection = await query.get(connectionId);

  if (connection.get('to').id !== user.id) {
    throw new UpdateConnectionError(
      '[z5oe1hzG] Connections can only be updated by receiving an user.',
    );
  }

  // If there is an existing connection, update and return it
  if (connection instanceof Connection) {
    if (status === STATUS_ACCEPTED) {
      const fromUser = connection.get('from');
      const toUser = connection.get('to');
      const channel = await ChatService.createChatChannel(fromUser, uniqueId);
      await ChatService.addMembersToChannel(channel.sid, [
        fromUser.id,
        toUser.id,
      ]);
      connection.set('channelSid', channel.sid);
    }
    connection.set('status', status);
    await connection.save(null, { useMasterKey: true });
  }
  throw new UpdateConnectionError('[TeeBMaPz] Connection not found');
};

export default updateConnection;
