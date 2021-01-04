// Providers
import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';

class QuePositionsServiceError extends ExtendableError {}

/**
 * Updates the QuePositions data
 * @param {*} field
 * @param {*} value
 */
const update = async (field, value) => {
  try {
    const quePositions = await new Parse.Query('QuePositions').first();
    if (quePositions.get(field) < value) {
      quePositions.set(field, value);
    }
    await quePositions.save(null, { useMasterKey: true });
  } catch (error) {
    throw new QuePositionsServiceError(error.message);
  }
};

export default {
  update,
};
