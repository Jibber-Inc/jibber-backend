import ExtendableError from 'extendable-error-class';
import Parse from '../../providers/ParseProvider';

class MomentAfterSaveError extends ExtendableError {}

/**
 * After save webhook for User objects.
 * @param {Object} request
 */
const momentAfterSave = async request => {
  const moment = request.object;

  console.log('Estoy en moment after save')

  if (!(moment instanceof Parse.Moment)) {
    throw new UserAfterSaveError('[c4V3VYAu] Expected moment in request.object');
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

export default momentAfterSave;
