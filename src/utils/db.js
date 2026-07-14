import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';

class DbUtilError extends ExtendableError {}

const SEQUENCE_CLASS = 'Sequence';

const findSequence = sequenceOfName =>
  new Parse.Query(SEQUENCE_CLASS)
    .equalTo('name', sequenceOfName)
    .first({ useMasterKey: true });

const updateSequence = async (sequenceOfName, amount, initialValue) => {
  let sequence = await findSequence(sequenceOfName);

  if (!sequence) {
    sequence = new Parse.Object(SEQUENCE_CLASS);
    sequence.set('name', sequenceOfName);
    sequence.set('value', initialValue);
  } else {
    sequence.increment('value', amount);
  }

  await sequence.save(null, { useMasterKey: true });
  return sequence.get('value');
};

/**
 * Simulate sequence nextval() on relational db's.
 *
 * @param {String} sequenceOfName
 */
const getValueForNextSequence = async sequenceOfName => {
  try {
    return await updateSequence(sequenceOfName, 1, 1);
  } catch (error) {
    throw new DbUtilError(error.message);
  }
};

/** *
 * Decrement by 1 the value for the given sequence.
 *
 * @param {String} sequenceOfName
 */
const getPreviousValueForSequence = async sequenceOfName => {
  try {
    return await updateSequence(sequenceOfName, -1, 0);
  } catch (error) {
    throw new DbUtilError(error.message);
  }
};

/**
 * Read sequence current value.
 *
 * @param {String} sequenceOfName
 */
const getCurrentValueSequence = async sequenceOfName => {
  try {
    const sequence = await findSequence(sequenceOfName);
    return sequence ? sequence.get('value') : null;
  } catch (error) {
    throw new DbUtilError(error.message);
  }
};

export default {
  getValueForNextSequence,
  getCurrentValueSequence,
  getPreviousValueForSequence,
};
