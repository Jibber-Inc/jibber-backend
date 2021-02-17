import ExtendableError from 'extendable-error-class';
import UserService from '../services/UserService';

class SetActiveStatusError extends ExtendableError {}

/**
 * Sets the user's status from inactive to active
 * @param {*} request
 */
const setActiveStatus = async request => {
  const { user } = request;
  try {
    const updatedUser = await UserService.setActiveStatus(user);
    return updatedUser;
  } catch (error) {
    throw new SetActiveStatusError(error.message);
  }
};

export default setActiveStatus;
