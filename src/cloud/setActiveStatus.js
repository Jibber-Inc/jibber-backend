import ExtendableError from 'extendable-error-class';
import UserService from '../services/UserService';
// Providers
import Parse from '../providers/ParseProvider';

class SetActiveStatusError extends ExtendableError { }

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
    throw new SetActiveStatusError('Given name and family name are mandatory.')
  }

  try {
    const updatedUser = await UserService.setActiveStatus(user, givenName, familyName);
    return updatedUser;
  } catch (error) {
    throw new SetActiveStatusError(error.message);
  }
};

export default setActiveStatus;
