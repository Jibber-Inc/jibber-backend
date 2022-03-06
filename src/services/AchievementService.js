// Vendor
// import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';


// class AchievementServiceError extends ExtendableError { }

/**
 * 
 * @param {*} type 
 * @returns 
 */
const getAchievementType = async (type) => {
  const achievementType = await new Parse.Query('AchievementType').equalTo('type', type).first({ useMasterKey: true });
  return achievementType;
};

const createAchievement = (transaction, type) => {
  const achievement = new Parse.Object('Achievement');
  achievement.set('type', type);
  achievement.set('transaction', transaction);
  achievement.save(null, { useMasterKey: true });
  return achievement;
};

export default {
  getAchievementType,
  createAchievement
};
