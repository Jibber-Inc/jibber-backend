import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import db from '../utils/db';

class SetActiveStatusError extends ExtendableError {}

/**
 *
 * @param {*} user
 */
const getUserHandle = async user => {
  const config = await Parse.Config.get({ useMasterKey: true });
  const maxQuePosition = config.get('maxQuePosition');
  // If the user has a quePosition already, use it. Else, get a new quePosition
  let quePosition;
  if (user.get('quePosition')) {
    quePosition = user.get('quePosition');
  } else {
    quePosition = await db.getValueForNextSequence('unclaimedPosition');
  }
  const handlePositioN = quePosition / maxQuePosition;
  // Generate the user handler
  const name = `${user.get('givenName')}${user
    .get('familyName')
    .substring(0, 1)}`;
  const userHandle = `@${name.toLowerCase()}_${handlePositioN}`;

  return userHandle.replace('.', '');
};

/**
 *
 * @param {*} request
 */
const setActiveStatus = async request => {
  const { user } = request;

  if (!(user instanceof Parse.User)) {
    throw new SetActiveStatusError('[zIslmc6c] User not found');
  }
  if (user.get('status') === 'inactive') {
    const handle = await getUserHandle(user);
    user.set('handle', handle);
    user.set('status', 'active');
    await db.getValueForNextSequence('claimedPosition');
    await user.save(null, { useMasterKey: true });
  }

  return user;
};

export default setActiveStatus;
