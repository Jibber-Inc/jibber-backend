// Vendor
import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
import PushService from './PushService';
// Constants
import { TRANSACTION } from '../constants/transactions';
// Services
import AchievementTypeService from './AchievementTypeService';
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

const createTransaction = async (user, type, admin = null, note = null) => {
  if (!user || !(user instanceof Parse.User)) throw new TransactionServiceError('User is required.');
  if (!type) throw new TransactionServiceError('Transaction type is required.');
  if (!admin || !(admin instanceof Parse.User)) {
    // eslint-disable-next-line no-param-reassign
    admin = await getAdmin();
  }

  let achievementType = await AchievementTypeService.getAchievementType(type);
  if (!achievementType) {
    achievementType = AchievementTypeService.getFallbackAchievement(type);
  }
  if (!achievementType) throw new TransactionServiceError('Type doesn\'t match an AchievementType.');

  console.log(' ****************************************** achievementType ****************************************** ')
  console.log(' ****************************************** achievementType ****************************************** ', achievementType)
  console.log(' ****************************************** achievementType ****************************************** ')

  if (!admin || !(admin instanceof Parse.User)) {
    throw new TransactionServiceError('Admin is required.');
  } else {
    const transaction = new Parse.Object('Transaction');
    transaction.set('from', admin);
    transaction.set('to', user);
    transaction.set('note', note || achievementType.title);
    transaction.set('amount', achievementType.bounty);
    transaction.set('eventType', achievementType.type);
    transaction.setACL(new Parse.ACL(user));
    await transaction.save(null, { useMasterKey: true });
    return transaction;
  }
};

const createTransactionForAchievement = async (user, type, isRepeatable = false, note = '') => {
  try {
    if (!user || !(user instanceof Parse.User)) throw new TransactionServiceError('User is required.');
    if (!type) throw new TransactionServiceError('Transaction type is required.');

    if (!isRepeatable) {
      // If not repeatable and there's already a transaction for that type
      // return the existing transaction
      const existingTransaction = await new Parse.Query('Transaction')
        .equalTo('to', user)
        .equalTo('eventType', type)
        .first({ useMasterKey: true });

      if (existingTransaction) return existingTransaction;
    }

    const admin = await getAdmin();
    const transaction = await createTransaction(
      user,
      type,
      admin,
      note
    );
    await sendPushForTransaction(admin, user, transaction);

    return transaction;
  } catch (error) {
    throw new TransactionServiceError(error);
  }
};

export default {
  createTransactionForAchievement,
  createTransaction
};
