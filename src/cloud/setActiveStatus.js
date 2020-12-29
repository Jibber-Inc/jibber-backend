import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import db from '../utils/db';
import ChatService from '../services/ChatService';

class SetActiveStatusError extends ExtendableError {}

/**
 *
 * @param {*} user
 */
const createUserChannels = async user => {
  // Add to channel members the user
  const members = [user.id];

  // If the desired role exists, add to channel members the admin with that role
  // Get parse role
  const onboardingRole = await new Parse.Query(Parse.Role)
    .equalTo('name', 'ONBOARDING_ADMIN')
    .first();
  if (onboardingRole) {
    // If the role is defined, get the first user with it
    const admin = await onboardingRole.get('users').query().first();
    // If we have users with the desired role, add them to the members
    if (admin) {
      members.push(admin.id);
    }
  }

  // Create the channels
  const welcomeChannel = await ChatService.createChatChannel(
    user,
    `welcome_${user.id}`,
    'welcome',
    'private',
  );
  await ChatService.addMembersToChannel(welcomeChannel.sid, members);

  const feedbackChannel = await ChatService.createChatChannel(
    user,
    `feedback_${user.id}`,
    'feedback',
    'private',
  );
  await ChatService.addMembersToChannel(feedbackChannel.sid, members);
};

/**
 *
 * @param {*} user
 */
const getUserHandle = async (user, claimedPosition) => {
  const config = await Parse.Config.get({ useMasterKey: true });
  const maxQuePosition = config.get('maxQuePosition');
  // If the user has a quePosition already, use it. Else, get a new quePosition
  const handlePositioN = claimedPosition / maxQuePosition;
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
    const claimedPosition = await db.getValueForNextSequence('claimedPosition');
    const handle = await getUserHandle(user, claimedPosition);
    user.set('handle', handle);
    user.set('status', 'active');
    await user.save(null, { useMasterKey: true });
  }

  createUserChannels(user);

  return user;
};

export default setActiveStatus;
