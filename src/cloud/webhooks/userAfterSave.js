import ExtendableError from 'extendable-error-class';
import Parse from '../../providers/ParseProvider';

class UserAfterSaveError extends ExtendableError {}

/**
 * After save webhook for User objects.
 * @param {Object} request
 */
const userAfterSave = async request => {
  const user = request.object;

  if (!(user instanceof Parse.User)) {
    throw new UserAfterSaveError('[c4V3VYAu] Expected user in request.object');
  }
  if (!(user.createdAt instanceof Date)) {
    throw new UserAfterSaveError(
      '[hplRppBn] Expected user.createdAt to be instanceof Date',
    );
  }
  if (!(user.updatedAt instanceof Date)) {
    throw new UserAfterSaveError(
      '[3Npvri9X] Expected user.updatedAt to be instanceof Date',
    );
  }
};

export default userAfterSave;
