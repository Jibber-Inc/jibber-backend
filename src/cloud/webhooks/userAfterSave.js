import Parse from '../../providers/ParseProvider';
import ExtendableError from 'extendable-error-class';
import { isISO8601 } from 'validator';

import createChatChannel from '../../utils/createChatChannel';


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
  if (!isISO8601(user.createdAt)) {
    throw new UserAfterSaveError(
      '[hplRppBn] Expected user.createdAt to be ISO timestamp'
    );
  }
  if (!isISO8601(user.updatedAt)) {
    throw new UserAfterSaveError(
      '[3Npvri9X] Expected user.updatedAt to be ISO timestamp'
    );
  }

  // Create new user chat channels
  // Since user.isNew() will always be false in the afterSave hook
  // we're comparing the createdAt/updatedAt timestamps to determine a new user
  if (user.createdAt === user.updatedAt) {
    Promise.all([
      createChatChannel(user, `Welcome_${user.id}`, 'Welcome!'),
      createChatChannel(user, `Feedback_${user.id}`, 'Feedback'),
      createChatChannel(user, `Ideas_${user.id}`, 'Ideas'),
    ]);
  }
};


export default userAfterSave;
