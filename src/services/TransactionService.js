// Vendor
import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
import PushService from './PushService';
// Constants
import { TRANSACTION } from '../constants/transactions';
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
      transaction.set('note', TRANSACTION.INITIAL_NOTE);
      transaction.set('amount', 1);
      transaction.set('eventType', TRANSACTION.EVENT_TYPE);
      await transaction.save(null, { useMasterKey: true });
    }

    if (transaction) {
      const amount = transaction.get('amount');
      const coin = amount !== 1 ? 'Jibs' : 'Jib';
      const notificationData = {
        identifier: `transaction_${transaction.id}`,
        title: `${amount} ${coin} received`,
        body: transaction.note,
        target: TRANSACTION.TARGET,
        category: TRANSACTION.CATEGORY,
        author: benjiAdmin.id,
      };
      await PushService.sendPushNotificationToUsers(notificationData, [user]);
    }

    return transaction;
  } catch (error) {
    throw new TransactionServiceError(error);
  }
}


export default {
  createInitialTransaction,
};
