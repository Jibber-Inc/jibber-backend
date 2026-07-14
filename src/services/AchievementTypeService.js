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
  const achievementType = await new Parse.Query('AchievementType')
    .equalTo('type', type)
    .first({ useMasterKey: true });
  if (achievementType) return achievementType;

  const fallback = getFallbackAchievement(type);
  if (!fallback) return undefined;

  // Fresh staging/production apps may not have static achievement rows yet.
  // Materialize the checked-in definition on first use so onboarding is not
  // blocked by missing seed data.
  const newAchievementType = new Parse.Object('AchievementType');
  Object.entries(fallback).forEach(([key, value]) => {
    newAchievementType.set(key, value);
  });
  const acl = new Parse.ACL();
  acl.setPublicReadAccess(true);
  newAchievementType.setACL(acl);
  return newAchievementType.save(null, { useMasterKey: true });
};

export default {
  getAchievementType,
  getFallbackAchievement,
};
