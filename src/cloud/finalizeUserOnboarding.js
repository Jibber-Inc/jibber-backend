import ExtendableError from 'extendable-error-class';
import UserService from '../services/UserService';
// Providers
import Parse from '../providers/ParseProvider';
// Constants
import UserStatus from '../constants/userStatus';
// Services
import ChatService from '../services/ChatService';
import PassService from '../services/PassService';
import ReservationService, { ReservationServiceError } from '../services/ReservationService';
import NoticeService from '../services/NoticeService';
// Notifications
import { NOTIFICATION_TYPES } from '../constants';
// import CircleService from '../services/CircleService';

class FinalizeUserOnboardingError extends ExtendableError { }

// Users that come with a reservation has full access
// Users without a reservation are placed in a queue.
// Their position in the queue is set when they send the validation code
// The user status can be one of: active, inactive, waitlist
// If the position is higher than the max allowed position (maxQuePosition), they get the waitlist status
// Active: users that have full access to the application
// Inactive: users that have full access to the application, but they didnt end the onboarding yet
// Waitlist: users in the Waitlist have to wait until the maxQuePosition is increased, letting more users get full access.
const setUserStatus = async (user, reservation = null) => {
  // TODO: Uncomment when we use again the currentQuePosition logic.
  // Get the needed que values to calculate the user status
  // const config = await Parse.Config.get({ useMasterKey: true });
  // get maxQuePosition from parse. This variable is manually set depending on the needs
  // const maxQuePosition = config.get('maxQuePosition');
  // get the last position of the queue + 1. For more information, check db import.
  // let currentQuePosition = user.get('quePosition');

  // if (!currentQuePosition) {
  //   currentQuePosition = await db.getValueForNextSequence('unclaimedPosition');

  //   await QuePositionsService.update('unclaimedPosition', currentQuePosition);
  // }

  if (user.get('status') && user.get('status') !== UserStatus.USER_STATUS_INACTIVE) {

    if (reservation) {
      user.set('status', UserStatus.USER_STATUS_INACTIVE);
    } else {
      // TODO: Uncomment when we use again the currentQuePosition logic.
      // user.set('quePosition', currentQuePosition);
      // if (maxQuePosition >= currentQuePosition) {
      //   user.set('status', 'inactive');
      // } else {
      //   user.set('status', 'waitlist');
      // }
      user.set('status', UserStatus.USER_STATUS_WAITLIST);
    }
  }
};


const createInitialConversations = async (user) => {
  // Here we create the user in Stream
  const createdUser = await UserService.upsertUser({ id: user.id });
  await ChatService.createWaitlistConversation(user);
  return createdUser
};

/**
 * Sets the user's status from inactive to active
 * @param {*} request
 */
const finalizeUserOnboarding = async request => {
  const { user, params } = request;
  const { reservationId, passId } = params;

  try {
    if (!(user instanceof Parse.User)) {
      throw new FinalizeUserOnboardingError('User not found');
    }

    if (!user.get('givenName') && !user.get('familyName')) {
      throw new FinalizeUserOnboardingError('User givenName and familyName not set. Initial conversations not created.');
    }

    if (reservationId) {
      user.set('status', UserStatus.USER_STATUS_INACTIVE);
      await ReservationService.handleReservation(reservationId, user);

    } else if (passId) {

      user.set('status', UserStatus.USER_STATUS_INACTIVE);
      await PassService.handlePass(passId, user);
    } else {
      user.set('status', UserStatus.USER_STATUS_WAITLIST);
    }

    const noticeData = {
      type: NOTIFICATION_TYPES.UNREAD_MESSAGES,
      body: 'You have 0 unread messages',
      attributes: {
        unreadMessageIds: []
      },
      priority: 1,
      user
    };

    // Create the Notice object
    await NoticeService.createNotice(noticeData);

    // Hold on with this functionality
    // await CircleService.createCircle(user);

    const currentUserStatus = user.get('status');
    switch (currentUserStatus) {
      case UserStatus.USER_STATUS_WAITLIST:
        await createInitialConversations(user, currentUserStatus);
        break;

      case UserStatus.USER_STATUS_INACTIVE:
        await UserService.setActiveStatus(user);
        break;

      default:
        throw new FinalizeUserOnboardingError('');
    }

    user.save(null, { useMasterKey: true });

    return user;
  } catch (error) {
    if (error instanceof ReservationServiceError) {
      setUserStatus(user);
      user.save(null, { useMasterKey: true });
      throw error;
    }
    throw new FinalizeUserOnboardingError(error.message);
  }
};

export default finalizeUserOnboarding;
