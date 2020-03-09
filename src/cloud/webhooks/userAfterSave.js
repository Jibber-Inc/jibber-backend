import createChatChannel from '../../utils/createChatChannel';


/**
 * After save webhook for User objects.
 * @param {Object} request
 */
const userAfterSave = request => {
  const user = request.object;

  // Create new user chat channels
  // Since user.isNew() will always be false in the afterSave hook
  // we're comparing the createdAt/updatedAt timestamps to determine a new user
  if (user.createdAt === user.updatedAt) {
    Promise.all([
      createChatChannel(user, `Welcome_${user.id}`, 'Welcome!'),
      createChatChannel(user, `Feedback_${user.id}`, 'Feedback'),
      createChatChannel(user, `Ideas_${user.id}`, 'Ideas'),
    ]);
  }
};


export default userAfterSave;
