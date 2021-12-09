import ExtendableError from 'extendable-error-class';
import ChatService from './ChatService';
import UserService from './UserService';
import Parse from '../providers/ParseProvider';

export class ReservationServiceError extends ExtendableError {}

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

const hasReservations = async user => {
  const count = await new Parse.Query('Reservation')
    .equalTo('createdBy', user)
    .count({ useMasterKey: true });
  return count > 0;
};

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
    const conversationId = reservation.get('conversationId');

    if (conversationId) {
      const conversation = await ChatService.getConversationById(
        conversationId,
      );

      await UserService.upsertUser({ id: user.id });
      await ChatService.addMemberToConversation(conversation, [user.id]);
    }
  } catch (error) {
    throw new ReservationServiceError(
      `Reservation cannot be claimed. Detail: ${error.message}`,
    );
  }
};

export default {
  createReservations,
  createReservation,
  checkReservation,
  hasReservations,
  claimReservation,
};
