import ExtendableError from 'extendable-error-class';
import UserService from '../services/UserService';
// Providers
import Parse from '../providers/ParseProvider';
// Constants
import UserStatus from '../constants/userStatus';
// Constants
import { TRANSACTION } from '../constants/transactions';
// Services
import ChatService from '../services/ChatService';
import PassService from '../services/PassService';
import ReservationService from '../services/ReservationService';
import NoticeService from '../services/NoticeService';
// Notifications
import { NOTIFICATION_TYPES } from '../constants';
import TransactionService from '../services/TransactionService';
import QuePositionsService from '../services/QuePositionsService';
// Utils
import db from '../utils/db';

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
    } else {
      user.set('status', UserStatus.USER_STATUS_WAITLIST);
    }
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

    await setUserStatus(user, reservationId, passId);

    // Check if the user has a UNREAD_MESSAGES Notice
    const notice = await new Parse.Query('Notice')
      .equalTo('owner', user)
      .equalTo('type', NOTIFICATION_TYPES.UNREAD_MESSAGES)
      .first({ useMasterKey: true });
    // If the user doesn't have a UNREAD_MESSASES Notice, create one
    if (!notice) {
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
    }

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
        break;
    }

    // Check if the user has a NEW_USER Transaction
    const initialTransaction = await new Parse.Query('Transaction')
      .equalTo('to', user)
      .equalTo('eventType', TRANSACTION.EVENT_TYPE.NEW_USER)
      .first({ useMasterKey: true });
    // If not, create one
    if (!initialTransaction) {
      await TransactionService.createInitialTransaction(user);
    }

    user.save(null, { useMasterKey: true });

    return user;
  } catch (error) {
    throw new FinalizeUserOnboardingError(error.message);
  }
};

export default finalizeUserOnboarding;
