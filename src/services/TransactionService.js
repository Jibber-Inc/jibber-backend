// Vendor
import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
import PushService from './PushService';
import AchievementService from './AchievementService';
// Constants
import { TRANSACTION } from '../constants/transactions';
// Load Environment Variables
const { BENJI_PHONE_NUMBER } = process.env;


class TransactionServiceError extends ExtendableError { }

/**
 * Get the transaction's sender (admin - Benji)
 * 
 * @returns 
 */
const getAdmin = async () => {
  // Retrieve the user with the phoneNumber
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('phoneNumber', BENJI_PHONE_NUMBER);
  const admin = await userQuery.first({ useMasterKey: true });
  return admin;
};

/**
 * Notify the user
 * 
 * @param {*} transaction 
 * @param {*} admin 
 */
const sendPushForTransaction = async (admin, user, transaction) => {
  if (transaction) {
    const amount = transaction.get('amount');
    const coin = amount !== 1 ? 'Jibs' : 'Jib';
    const notificationData = {
      identifier: `transaction_${transaction.id}`,
      title: `${amount} ${coin} received`,
      body: transaction.note,
      target: TRANSACTION.TARGET,
      category: TRANSACTION.CATEGORY,
      author: admin.id,
    };
    await PushService.sendPushNotificationToUsers(notificationData, [user]);
  }
};

const createTransaction = async (admin = null, user, type = null, note = null) => {
  if (!user || !(user instanceof Parse.User)) throw new TransactionServiceError('User is required.');
  if (!admin || !(admin instanceof Parse.User)) {
    // eslint-disable-next-line no-param-reassign
    admin = await getAdmin();
  }

  const achievementType = await AchievementService.getAchievementType(type);

  if (!admin || !(admin instanceof Parse.User)) {
    throw new TransactionServiceError('Admin is required.');
  } else {
    const transaction = new Parse.Object('Transaction');
    transaction.set('from', admin);
    transaction.set('to', user);
    transaction.set('note', note || achievementType.title);
    transaction.set('amount', achievementType.amount);
    transaction.set('eventType', achievementType.type);
    await transaction.save(null, { useMasterKey: true });
    return transaction;
  }
};

const createInitialTransaction = async (user) => {
  try {
    if (!user || !(user instanceof Parse.User)) throw new TransactionServiceError('User is required.');

    const admin = await getAdmin();
    const transaction = await createTransaction(
      admin,
      user,
      TRANSACTION.EVENT_TYPE.INTEREST_PAYMENT,
      TRANSACTION.INITIAL_NOTE
    );
    await sendPushForTransaction(admin, user, transaction);

    return transaction;
  } catch (error) {
    throw new TransactionServiceError(error);
  }
};

export default {
  createInitialTransaction,
  createTransaction
};
