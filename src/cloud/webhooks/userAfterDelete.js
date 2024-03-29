import ExtendableError from 'extendable-error-class';
import Parse from '../../providers/ParseProvider';
import ChatService from '../../services/ChatService';
import NoticeService from '../../services/NoticeService';
import UserService from '../../services/UserService';

class UserAfterDeleteError extends ExtendableError { }

/**
 * After delete webhook for User objects.
 * @param {Object} request
 */
const userAfterDelete = async request => {
  const { object: user } = request;

  if (!(user instanceof Parse.User)) {
    throw new UserAfterDeleteError(
      '[c4V3VYAu] Expected user in request.object',
    );
  }

  try {
    await Promise.all([
      UserService.deleteConnections(user),
      UserService.deleteReservations(user),
      UserService.deleteUserInstallations(user),
      UserService.clearUserSessions(user),
      UserService.resetReservations(user),
      ChatService.deleteUser(user.id),
      NoticeService.deleteAllNoticeByUser(user)
    ]);
  } catch (error) {
    console.warn(error);
  }
};

export default userAfterDelete;
