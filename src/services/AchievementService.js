// Vendor
import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
// Services
// eslint-disable-next-line import/no-cycle
import TransactionService from './TransactionService';
import AchievementTypeService from './AchievementTypeService';

class AchievementServiceError extends ExtendableError { }

/**
 * 
 * @param {*} transaction 
 * @param {*} type 
 * @returns 
 */
const createAchievement = async (transaction, achievementType, user) => {
  if (!achievementType) throw new AchievementServiceError('Achievement type is required.');
  if (!transaction) throw new AchievementServiceError('Transaction is required.');

  const achievement = new Parse.Object('Achievement');
  achievement.set('type', achievementType);
  achievement.set('transaction', transaction);
  achievement.setACL(new Parse.ACL(user));
  achievement.save(null, { useMasterKey: true });
  transaction.set('achievement', achievement);
  transaction.save(null, { useMasterKey: true });
  return achievement;
};

const createAchievementAndTransaction = async (user, type, note = '') => {
  if (!type) throw new AchievementServiceError('Achievement type is required.');

  const achievementType = await AchievementTypeService.getAchievementType(type);
  if (!achievementType) throw new AchievementServiceError('Achievement type not found.');

  let achievement;

  const isRepeatable = achievementType.get('isRepeatable');
  if (isRepeatable) {
    const transaction = await TransactionService.createTransaction(user, type);
    achievement = await createAchievement(transaction, achievementType, user);
  } else {
    achievement = await new Parse.Query('Achievement')
      .equalTo('type', achievementType)
      .first({ sessionToken: user.get('sessionToken') });

    if (!achievement) {
      const existingTransaction = await TransactionService.createTransactionForAchievement(user, type, isRepeatable, note);
      achievement = await createAchievement(existingTransaction, achievementType, user);
    }
  }

  return achievement;
};


export default {
  createAchievement,
  createAchievementAndTransaction
};
