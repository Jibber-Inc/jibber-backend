import ExtendableError from 'extendable-error-class';
import Parse from '../../providers/ParseProvider';

class MomentAfterSaveError extends ExtendableError {}

/**
 * After save webhook for Moment objects.
 * @param {Object} request
 */
const momentAfterSave = async request => {
  const moment = request.object;

  console.log('MOMENT After Save')
};

export default momentAfterSave;
