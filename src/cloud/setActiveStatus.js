import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import db from '../utils/db';

class SetActiveStatusError extends ExtendableError {}

/**
 *
 * @param {*} user
 */
const getUserHandler = async user => {
  const config = await Parse.Config.get({ useMasterKey: true });
  const maxQuePosition = config.get('maxQuePosition');
  // If the user has a quePosition already, use it. Else, get a new quePosition
  let quePosition;
  if (user.get('quePosition')) {
    quePosition = user.get('quePosition');
  } else {
    quePosition = await db.getValueForNextSequence('unclaimedPosition');
  }
  const handlerPositioN = quePosition / maxQuePosition;
  // Generate the user handler
  const name = `${user.get('givenName')}${user
    .get('familyName')
    .substring(0, 1)}`;
  const userHandler = `@${name.toLowerCase()}_${handlerPositioN}`;

  return userHandler.replace('.', '');
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
    const handler = await getUserHandler(user);
    user.set('status', 'active');
    user.set('handler', handler);
    await user.save(null, { useMasterKey: true });
  }

  return user;
};

export default setActiveStatus;
