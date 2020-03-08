import createChatChannel from '../../utils/createChatChannel';


/**
 * After save webhook for User objects.
 * @param {Object} request
 */
const userAfterSave = request => {
  const user = request.object;

  // Create new user chat channels
  if (user.isNew()) {
    Promise.all([
      createChatChannel(user, `Welcome_${user.id}`, 'Welcome!'),
      createChatChannel(user, `Feedback_${user.id}`, 'Feedback'),
      createChatChannel(user, `Ideas_${user.id}`, 'Ideas'),
    ]);
  }
};


export default userAfterSave;
