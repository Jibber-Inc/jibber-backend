import ExtendableError from 'extendable-error-class';
import UserService from '../services/UserService';
// Providers
import Parse from '../providers/ParseProvider';
// Constants
import UserStatus from '../constants/userStatus';
// Services
import ChatService from '../services/ChatService';

// Load Environment Variables
const { CREATE_WELCOME_CONVERSATION } = process.env;

class SetActiveStatusError extends ExtendableError { }

/**
 * Sets the user's status from inactive to active
 * @param {*} request
 */
const setActiveStatus = async request => {
  const { user } = request;

  try {
    if (!(user instanceof Parse.User)) {
      throw new SetActiveStatusError('User not found');
    }

    if (!user.get('givenName') && !user.get('familyName')) {
      throw new SetActiveStatusError('User givenName and familyName not set. Initial conversations not created.');
    }

    const updatedUser = await UserService.setActiveStatus(user);

    // Here we create the user in Stream
    await UserService.connectUser(updatedUser);

    // At this point, if the user hasn't 'active' status, he/she is in the waitlist
    // So default chat channels won't be created for the user yet.
    if (
      updatedUser.get('status') === UserStatus.USER_STATUS_ACTIVE &&
      CREATE_WELCOME_CONVERSATION
    ) {
      await ChatService.createInitialConversations(updatedUser);
    }

    return updatedUser;
  } catch (error) {
    throw new SetActiveStatusError(error.message);
  }
};

export default setActiveStatus;
