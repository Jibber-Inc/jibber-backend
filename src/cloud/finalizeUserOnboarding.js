import ExtendableError from 'extendable-error-class';
import UserService from '../services/UserService';
// Providers
import Parse from '../providers/ParseProvider';
// Constants
import UserStatus from '../constants/userStatus';
// Services
import ChatService from '../services/ChatService';
import PassService from '../services/PassService';
import ReservationService from '../services/ReservationService';
import NoticeService from '../services/NoticeService';
// Notifications
import QuePositionsService from '../services/QuePositionsService';
import AchievementService from '../services/AchievementService';
// Utils
import db from '../utils/db';
import { ACHIEVEMENTS } from '../constants/achievements';
import { TRANSACTION } from '../constants/transactions';

class FinalizeUserOnboardingError extends ExtendableError { }

// Users that come with a reservation have full access.
// Users without a reservation are placed in a queue.
// Their position in the queue is set when they send the validation code.
// The user status can be one of: active, inactive, waitlist
// Active: users that have full access to the application
// Inactive: users that have full access to the application, but they didn't finish the onboarding yet
// Waitlist: users in the Waitlist have to wait until the maxQuePosition is increased, letting more users get full access.
// If the position is higher than the max allowed position (maxQuePosition), they get the waitlist status
const setUserStatus = async (user, reservationId, passId) => {
  // Get the needed que values to calculate the user status
  const config = await Parse.Config.get({ useMasterKey: true });
  // get maxQuePosition from parse. This variable is manually set depending on the needs
  const maxQuePosition = config.get('maxQuePosition');
  let currentQuePosition = user.get('quePosition');

  if (!currentQuePosition) {
    // get the last position of the queue + 1. For more information, check db import.
    currentQuePosition = await db.getValueForNextSequence('unclaimedPosition');
    await QuePositionsService.update('unclaimedPosition', currentQuePosition);
  }

  user.set('quePosition', currentQuePosition);

  if (user.get('status') && user.get('status') !== UserStatus.USER_STATUS_ACTIVE) {
    if (reservationId || passId) {
      user.set('status', UserStatus.USER_STATUS_ACTIVE);
    } else if (maxQuePosition >= currentQuePosition) {
      user.set('status', UserStatus.USER_STATUS_INACTIVE);
    } /* else {
    //  user.set('status', UserStatus.USER_STATUS_WAITLIST);
    } */
  }

  return user;
};

/**
 * 
 * @param {*} user 
 * @returns 
 */
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
      await ReservationService.handleReservation(reservationId, user);
    } else if (passId) {
      await PassService.handlePass(passId, user);
    }

    // Set the user status depending on the reservations, passes and QuePositions
    await setUserStatus(user, reservationId, passId);

    // If the user has a unreadMessages notice, it won't create one.
    // Otherwise, a new notice with the type unreadMessages will be created.
    await NoticeService.createUnreadMessagesNotice(user);

    // Hold on with this functionality
    // await CircleService.createCircle(user);

    const currentUserStatus = user.get('status');
    switch (currentUserStatus) {
     /* case UserStatus.USER_STATUS_WAITLIST:
        break; */

      case UserStatus.USER_STATUS_INACTIVE:
        await UserService.setActiveStatus(user);
        break;

      default:
        break;
    }

    // Create an intial conversation if one does not already exist 
    await createInitialConversations(user, currentUserStatus);

    // Upsert achievement INTEREST_PAYMENT (new user).
    await AchievementService.createAchievementAndTransaction(
      user,
      ACHIEVEMENTS.joinJibber.type,
      TRANSACTION.INITIAL_NOTE
    );

    // Upsert achievement FIRST_10K.
    await AchievementService.createAchievementAndTransaction(
      user,
      ACHIEVEMENTS.firstTenK.type
    );

    user.save(null, { useMasterKey: true });

    return user;
  } catch (error) {
    throw new FinalizeUserOnboardingError(error.message);
  }
};

export default finalizeUserOnboarding;
