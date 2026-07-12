import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';

const Config = require('parse-server/lib/Config');

class DbUtilError extends ExtendableError {}

const getFindOneAndUpdateDocument = result => {
  // MongoDB Driver 6+ returns the document directly by default. Older Parse
  // Server releases returned a ModifyResult wrapper with a `value` property.
  if (result && Object.prototype.hasOwnProperty.call(result, 'value')) {
    return result.value;
  }
  return result;
};

function getDatabaseInstance() {
  const config = Config.get(Parse.applicationId);
  const { database } = config.database.adapter;
  return database;
}

/**
 * Simulate sequence nextval() on relational db's.
 *
 * @param {String} sequenceOfName
 */
const getValueForNextSequence = async sequenceOfName => {
  try {
    const db = getDatabaseInstance();

    const sequences = db.collection('_sequences'); // returns new instance of _sequences if collections doesn't exists.
    const result = await sequences.findOneAndUpdate(
      { _id: sequenceOfName },
      { $inc: { sequence_value: 1 } },
      { upsert: true },
    );
    const value = getFindOneAndUpdateDocument(result);
    return !value ? 1 : value.sequence_value + 1;
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
    const db = getDatabaseInstance();

    const sequences = db.collection('_sequences'); // returns new instance of _sequences if collections doesn't exists.
    const result = await sequences.findOneAndUpdate(
      { _id: sequenceOfName },
      { $inc: { sequence_value: -1 } },
      { upsert: true },
    );
    const value = getFindOneAndUpdateDocument(result);
    return !value ? 0 : value.sequence_value - 1;
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
    const db = getDatabaseInstance();

    const sequences = db.collection('_sequences'); // returns new instance of _sequences if collections doesn't exists.
    const result = await sequences.findOne({ _id: sequenceOfName });
    return result ? result.sequence_value : result;
  } catch (error) {
    throw new DbUtilError(error.message);
  }
};

export default {
  getDatabaseInstance,
  getValueForNextSequence,
  getCurrentValueSequence,
  getPreviousValueForSequence,
};
