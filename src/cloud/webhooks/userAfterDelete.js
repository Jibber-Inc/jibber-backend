import Parse from '../../providers/ParseProvider';
import ExtendableError from 'extendable-error-class';

import ChatService from '../../services/ChatService';
import UserService from '../../services/UserService';

class UserAfterDeleteError extends ExtendableError {}

/**
 * After delete webhook for User objects.
 * @param {Object} request
 */
const userAfterDelete = async request => {
  const { object: user } = request;

  if (!Boolean(user instanceof Parse.User)) {
    throw new UserAfterDeleteError(
      '[c4V3VYAu] Expected user in request.object',
    );
  }

  await Promise.all([
    UserService.deleteRoutines(user),
    UserService.deleteUserInstallations(user),
    UserService.clearUserSessions(user),
    ChatService.deleteUser(user.id),
  ]);
};

export default userAfterDelete;
