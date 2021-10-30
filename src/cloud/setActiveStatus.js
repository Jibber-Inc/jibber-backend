import ExtendableError from 'extendable-error-class';
import UserService from '../services/UserService';
// Providers
import Parse from '../providers/ParseProvider';
// Constants
import UserStatus from '../constants/userStatus';
// Services
import ChatService from '../services/ChatService';

class SetActiveStatusError extends ExtendableError { }

/**
 * Sets the user's status from inactive to active
 * @param {*} request
 */
const setActiveStatus = async request => {
  const { params, user } = request;
  const { givenName, familyName } = params;

  if (!(user instanceof Parse.User)) {
    throw new SetActiveStatusError('[zIslmc6c] User not found');
  }

  if (!givenName || !familyName) {
    throw new SetActiveStatusError('Given name and family name are mandatory.')
  }

  try {
    // user.set('givenName', givenName);
    // user.set('familyName', familyName);
    // await user.save(null, { useMasterKey: true });

    // const updatedUser = await UserService.setActiveStatus(user);

    // const result = await UserService.connectUser(user)

    // TODO: Remove this logic
    // Create the user Feed object and the related initial posts
    // await FeedService.createFeedForUser(user);
    // await FeedService.createUnreadMessagesPost(user);

    // At this point, if the user hasn't 'active' status, he/she is in the waitlist
    // So default chat channels won't be created for the user yet.
    // Also, if the user is 'active', the Feed and the inicial unreadMessages posts are created

    if (user.get('status') === UserStatus.USER_STATUS_ACTIVE) {
      // Check if the user has the initial channels already
      // const userHasInitialChannels = await ChatService.userHasInitialChannels(
      //   user.id,
      // );

      // console.log('userHasInitialChannelsuserHasInitialChannelsuserHasInitialChannels', userHasInitialChannels)

      // If the user doesn't have the initial channels, create them
      // if (!userHasInitialChannels) {
      //   await ChatService.createInitialChannels(user);
      // }
    }

    // const userHasInitialChannels = await ChatService.userHasInitialChannels(
    //   user.id,
    // );

    // console.log('userHasInitialChannelsuserHasInitialChannelsuserHasInitialChannels', userHasInitialChannels)

    await ChatService.createInitialChannels(user);
    // return { updatedUser, result };
    // return userHasInitialChannels;
  } catch (error) {
    throw new SetActiveStatusError(error.message);
  }
};

export default setActiveStatus;
