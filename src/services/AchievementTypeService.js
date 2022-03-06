// Vendor
import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
import { ACHIEVEMENTS } from '../constants/achievements';

class AchievementTypeServiceError extends ExtendableError { }

/**
 * Given a type, returns a static (hardcoded) achievement
 * 
 * @param {*} type 
 * @returns 
 */
const getFallbackAchievement = (type) => {
  const filtered = Object.values(ACHIEVEMENTS).filter(achievement => achievement.type === type);
  return filtered && filtered.length && filtered[0];
};

/**
 * Given a type, returns an achievement related
 * If no achievement is found in the database, will return a static as fallback
 * 
 * @param {*} type 
 * @returns 
 */
const getAchievementType = async (type) => {
  if (!type) throw new AchievementTypeServiceError('Achievement type is required.');
  const achievementType = await new Parse.Query('AchievementType').equalTo('type', type).first({ useMasterKey: true });
  return achievementType;
};

export default {
  getAchievementType,
  getFallbackAchievement,
};
