import ExtendableError from 'extendable-error-class';
import Parse from '../../providers/ParseProvider';
import ChatService from '../../services/ChatService';

class UserAfterSaveError extends ExtendableError {}

/**
 * After save webhook for User objects.
 * @param {Object} request
 */
const userAfterSave = async request => {
  const user = request.object;

  if (!(user instanceof Parse.User)) {
    throw new UserAfterSaveError('[c4V3VYAu] Expected user in request.object');
  }
  if (!(user.createdAt instanceof Date)) {
    throw new UserAfterSaveError(
      '[hplRppBn] Expected user.createdAt to be instanceof Date',
    );
  }
  if (!(user.updatedAt instanceof Date)) {
    throw new UserAfterSaveError(
      '[3Npvri9X] Expected user.updatedAt to be instanceof Date',
    );
  }

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

  // Create the channels for the new user
  if (!user.existed()) {
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
  }
};

export default userAfterSave;
