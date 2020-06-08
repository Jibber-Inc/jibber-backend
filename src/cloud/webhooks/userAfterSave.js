import Parse from '../../providers/ParseProvider';
import ExtendableError from 'extendable-error-class';

import ChatService from '../../services/ChatService';

class UserAfterSaveError extends ExtendableError {}

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

  // Create new user chat channels
  if (!user.existed()) {
    const wellcomeChannel = await ChatService.createChatChannel(
      user,
      `welcome_${user.id}`,
      'welcome',
      'private',
    );

    await ChatService.addMembersToChannel(wellcomeChannel.sid, [user.id]);
  }
};

export default userAfterSave;
