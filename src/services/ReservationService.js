import ExtendableError from 'extendable-error-class';
import ChatService from './ChatService';
import UserService from './UserService';
import PushService from './PushService';
import Parse from '../providers/ParseProvider';
import UserUtils from '../utils/userData';
import { INTERRUPTION_LEVEL_TYPES } from '../constants';


export class ReservationServiceError extends ExtendableError { }

/**
 * Create a reservation
 *
 * @param {Parse.User} user
 */
const createReservation = async user => {
  try {
    const reservation = new Parse.Object('Reservation');
    reservation.set('isClaimed'.false);
    reservation.set('createdBy', user);
    return reservation.save(null, { useMasterKey: true });
  } catch (error) {
    throw new ReservationServiceError(error.message);
  }
};

/**
 * Creates a fixed number of reservations for a given user.
 *
 * @param {Parse.User} user
 * @param {Number} number quantity of desired reservations
 */
const createReservations = async (user, number) => {
  try {
    return Promise.all([...Array(number)].map(() => createReservation(user)));
  } catch (error) {
    throw new ReservationServiceError(error.message);
  }
};

const checkReservation = async reservationId => {
  if (!reservationId) {
    throw new Error('reservation id is required');
  }
  let reservation;
  try {
    reservation = await new Parse.Query('Reservation').get(reservationId, {
      useMasterKey: true,
    });
    if (reservation.get('isClaimed')) {
      throw new Error(
        `[EdNzXDAN] Reservation id ${reservationId} is already claimed`,
      );
    }
    return reservation;
  } catch (error) {
    if (!reservation) {
      error.message = `[T2SuGHT7] Cannot find reservation id: ${reservationId}`;
    }
    throw new ReservationServiceError(error.message);
  }
};

/**
 * 
 * @param {*} user 
 * @returns 
 */
const hasReservations = async user => {
  const count = await new Parse.Query('Reservation')
    .equalTo('createdBy', user)
    .count({ useMasterKey: true });
  return count > 0;
};

/**
 * 
 * @param {*} reservationId 
 * @param {*} user 
 */
const claimReservation = async (reservationId, user) => {
  if (!reservationId) {
    throw new ReservationServiceError(
      'Reservation cannot be claim without reservationId',
    );
  }
  try {
    const reservation = await checkReservation(reservationId);
    // set reservation as claimed and create a connection between users
    reservation.set('isClaimed', true);
    reservation.set('user', user);
    await reservation.save(null, { useMasterKey: true });
    const conversationCid = reservation.get('conversationCid');

    if (conversationCid) {
      const conversation = await ChatService.getConversationByCid(
        conversationCid,
      );

      await UserService.upsertUser({ id: user.id });
      await ChatService.addMemberToConversation(conversation, [user.id]);
    }

    return reservation;
  } catch (error) {
    throw new ReservationServiceError(
      `Reservation cannot be claimed. Detail: ${error.message}`,
    );
  }
};

const handleReservation = async (reservationId, user) => {
  const reservation = await claimReservation(reservationId, user);
  const conversationCid = reservation.get('conversationCid');
  let conversation;

  if (!conversationCid) {
    const fromUser = reservation.get('createdBy');
    const toUser = user
    const conversationId = `conv_${fromUser.id}_${toUser.id}`;
    conversation = await ChatService.createConversation(
          fromUser,
          conversationId,
          'messaging',
          conversationId,
          [fromUser.id, toUser.id],
        );
  } else {
   conversation = await ChatService.getConversationByCid(
      conversationCid,
    );
  }

  const fromUser = await new Parse.Query(Parse.User).get(conversation.data.created_by.id);
  const toFullName = UserUtils.getFullName(user);

  const data = {
    messageId: null,
    conversationCid: conversation.conversationCid,
    title: `${toFullName} claimed your reservation! 🥳`,
    body: `${toFullName} accepted your invitation and was added to a conversation with you.`,
    target: 'conversation',
    category: 'connection.new',
    interruptionLevel: INTERRUPTION_LEVEL_TYPES.TIME_SENSITIVE,
    threadId: conversationCid,
    author: fromUser.id
  };

  await PushService.sendPushNotificationToUsers(
    data,
    [fromUser],
  );
};

export default {
  createReservations,
  createReservation,
  checkReservation,
  hasReservations,
  claimReservation,
  handleReservation
};
