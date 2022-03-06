// Vendor
import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
import { ACHIEVEMENTS } from '../constants/achievements';
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

const createNewUserAchievement = async (user) => {
  const achievementType = await AchievementTypeService.getAchievementType(ACHIEVEMENTS.joinJibber.type);
  if (!achievementType) throw new AchievementServiceError('Achievement type not found.');
  let initialAchievement = await new Parse.Query('Achievement')
    .equalTo('type', achievementType)
    .first({ sessionToken: user.get('sessionToken') });
  if (!initialAchievement) {
    const initialTransaction = await TransactionService.createInitialTransaction(user);
    initialAchievement = await createAchievement(initialTransaction, achievementType, user);
  }
  return initialAchievement;
};

export default {
  createAchievement,
  createNewUserAchievement
};
