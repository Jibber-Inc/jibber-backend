// Vendor
import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
// Utils
import UserUtils from '../utils/userData';
// Services
import QuePositionsService from './QuePositionsService';
// Constants
import UserStatus from '../constants/userStatus';
// Load Environment Variables
const { BENJI_PHONE_NUMBER } = process.env;


class TransactionServiceError extends ExtendableError { }

const createInitialTransaction = async (user) => {
  try {
    if (!user || !(user instanceof Parse.User)) throw new TransactionServiceError('User is needed');

    let transaction;

    // Retrieve the user with the phoneNumber
    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('phoneNumber', BENJI_PHONE_NUMBER);
    const benjiAdmin = await userQuery.first({ useMasterKey: true });

    if (benjiAdmin && benjiAdmin instanceof Parse.User) {
      transaction = new Parse.Object('Transaction');
      transaction.set('from', benjiAdmin);
      transaction.set('to', user);
      transaction.set('note', 'Welcome to Jibber.');
      transaction.set('amount', 1);
      transaction.set('type', 'NEW_USER');
      await transaction.save(null, { useMasterKey: true });
    }

    return transaction;
  } catch (error) {
    throw new TransactionServiceError(error);
  }
}


export default {
  createInitialTransaction,
};
