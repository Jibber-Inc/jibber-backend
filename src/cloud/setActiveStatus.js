import ExtendableError from 'extendable-error-class';
import UserService from '../services/UserService';
// Providers
import Parse from '../providers/ParseProvider';
// Constants
import UserStatus from '../constants/userStatus';
// Services
import ChatService from '../services/ChatService';


require('dotenv').config();

// Load Environment Variables
const { CREATE_WELCOME_CONVERSATION } = process.env;

class SetActiveStatusError extends ExtendableError {}

/**
 * Sets the user's status from inactive to active
 * @param {*} request
 */
const setActiveStatus = async request => {
  const { params, user } = request;
  const { givenName, familyName } = params;

  if (!(user instanceof Parse.User)) {
    throw new SetActiveStatusError('[zIslmc6c] User not found');
  }

  if (!givenName || !familyName) {
    throw new SetActiveStatusError('Given name and family name are mandatory.');
  }

  try {
    user.set('givenName', givenName);
    user.set('familyName', familyName);
    await user.save(null, { useMasterKey: true });

    const updatedUser = await UserService.setActiveStatus(user);

    // Here we create the user in Stream
    await UserService.connectUser(updatedUser);

    // At this point, if the user hasn't 'active' status, he/she is in the waitlist
    // So default chat channels won't be created for the user yet.
    if (updatedUser.get('status') === UserStatus.USER_STATUS_ACTIVE && CREATE_WELCOME_CONVERSATION) {
      await ChatService.createInitialChannels(updatedUser);
    }

    return updatedUser;
  } catch (error) {
    throw new SetActiveStatusError(error.message);
  }
};

export default setActiveStatus;
