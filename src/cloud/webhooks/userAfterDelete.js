import ExtendableError from 'extendable-error-class';
import Parse from '../../providers/ParseProvider';

import ChatService from '../../services/ChatService';
import UserService from '../../services/UserService';
import FeedService from '../../services/FeedService';

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
      ChatService.deleteUserChannels(user.id),
      ChatService.deleteTwilioUser(user.id),
      FeedService.deleteFeedAndPosts(user),
    ]);
  } catch (error) {
    console.log(error);
  }
};

export default userAfterDelete;
