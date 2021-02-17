// Providers
import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
// Utils
import db from '../utils/db';

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
      await quePositions.save(null, { useMasterKey: true });
    }
  } catch (error) {
    throw new QuePositionsServiceError(error.message);
  }
};

/**
 * Returns the maxQuePosition value
 */
const getMaxQuePosition = async () => {
  const config = await Parse.Config.get({ useMasterKey: true });
  const maxQuePosition = config.get('maxQuePosition');

  return maxQuePosition;
};

/**
 * Returns the claimedPosition value
 */
const getClaimedPosition = async () => {
  const claimedPosition = await db.getValueForNextSequence('claimedPosition');

  return claimedPosition;
};

export default {
  update,
  getMaxQuePosition,
  getClaimedPosition,
};
