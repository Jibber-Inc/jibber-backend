import Parse from '../providers/ParseProvider';
import ExtendableError from 'extendable-error-class';

const Config = require('parse-server/lib/Config');

class DbUtilError extends ExtendableError {}

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
    const _sequences = db.collection('_sequences'); // returns new instance of _sequences if collections doesn't exists.
    const { value } = await _sequences.findOneAndUpdate(
      { _id: sequenceOfName },
      { $inc: { sequence_value: 1 } },
      { upsert: true },
    );
    return !value ? value + 1 : value.sequence_value + 1;
  } catch (error) {
    console.log('db error');
    throw new DbUtilError(error.message);
  }
};

export default { getDatabaseInstance, getValueForNextSequence };
