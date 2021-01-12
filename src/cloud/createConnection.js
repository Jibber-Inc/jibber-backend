import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import ConnectionService from '../services/ConnectionService';

// Constants
import {
  STATUS_INVITED,
  STATUS_ACCEPTED,
  STATUS_DECLINED,
  STATUS_PENDING,
} from '../constants';
import { connection } from 'mongoose';

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
    throw new UpdateConnectionError('[t3K7GMD6] Expected to"');
  }

  const toUser = await new Parse.Query('User').equalTo('objectId', to).first();

  if (!(toUser instanceof Parse.User)) {
    throw new UpdateConnectionError('[uDA2jPox] To user not found.');
  }

  if (!(user instanceof Parse.User)) {
    throw new UpdateConnectionError('[uDA1jPox] Expected request.user');
  }

  if (!status) {
    throw new UpdateConnectionError('[t3K7GMD6] Expected "status"');
  }

  if (!STATUS_LIST.includes(status)) {
    throw new UpdateConnectionError(
      `[68wCOpBi] status must be one of ${STATUS_LIST}`,
    );
  }

  try {
    const connection = await ConnectionService.createConnection(
      user,
      toUser,
      status,
    );
    return connection;
  } catch (error) {
    throw new CreateConnectionError(error.message);
  }
};

export default createConnection;
