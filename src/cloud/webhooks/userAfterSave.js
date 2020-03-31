import Parse from '../../providers/ParseProvider';
import ExtendableError from 'extendable-error-class';

import createChatChannelService from '../../services/createChatChannelService';


class UserAfterSaveError extends ExtendableError {}


/**
 * After save webhook for User objects.
 * @param {Object} request
 */
const userAfterSave = request => {
  const user = request.object;

  if (!Boolean(user instanceof Parse.User)) {
    throw new UserAfterSaveError(
      '[c4V3VYAu] Expected user in request.object'
    );
  }
  if (!Boolean(user.createdAt instanceof Date)) {
    throw new UserAfterSaveError(
      '[hplRppBn] Expected user.createdAt to be instanceof Date'
    );
  }
  if (!Boolean(user.updatedAt instanceof Date)) {
    throw new UserAfterSaveError(
      '[3Npvri9X] Expected user.updatedAt to be instanceof Date'
    );
  }

  // Create new user chat channels
  if (!user.existed()) {
    Promise.all([
      createChatChannelService(user, `Welcome_${user.id}`, 'Welcome!'),
      createChatChannelService(user, `Feedback_${user.id}`, 'Feedback'),
      createChatChannelService(user, `Ideas_${user.id}`, 'Ideas'),
    ]);
  }
};


export default userAfterSave;
