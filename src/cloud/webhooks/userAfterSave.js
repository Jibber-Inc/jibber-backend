import Parse from '../../providers/ParseProvider';
import ExtendableError from 'extendable-error-class';
import ChatService from '../../services/ChatService';

import Twilio from '../../providers/TwilioProvider';


class UserAfterSaveError extends ExtendableError { }

/**
 * After save webhook for User objects.
 * @param {Object} request
 */
const userAfterSave = async request => {
  const user = request.object;

  if (!Boolean(user instanceof Parse.User)) {
    throw new UserAfterSaveError('[c4V3VYAu] Expected user in request.object');
  }
  if (!Boolean(user.createdAt instanceof Date)) {
    throw new UserAfterSaveError(
      '[hplRppBn] Expected user.createdAt to be instanceof Date',
    );
  }
  if (!Boolean(user.updatedAt instanceof Date)) {
    throw new UserAfterSaveError(
      '[3Npvri9X] Expected user.updatedAt to be instanceof Date',
    );
  }

  // Get parse role
  const onboarding_role = await new Parse.Query(Parse.Role).equalTo('name', 'ONBOARDING_ADMIN').first();
  // Get twilio users
  const users = await new Twilio().client.chat.services(process.env.TWILIO_SERVICE_SID).users.list();
  // Filter users by the desired role
  const onboardingAdmins = users.filter(user => user.roleSid === onboarding_role.get('twilioRoleSID'));
  const members = [user.id];
  // If we have users with the desired role, add them to the members
  if (onboardingAdmins.length) {
    members.push(onboardingAdmins[0].identity);
  }

  // Create channels for the new user
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
