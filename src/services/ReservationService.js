import ExtendableError from 'extendable-error-class';
import hat from 'hat';
import Parse from '../providers/ParseProvider';
import ConnectionService from './ConnectionService';
import ChatService from './ChatService';
import { STATUS_ACCEPTED } from '../constants';

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
    const fromUser = reservation.get('createdBy');
    const uniqueId = hat();
    const status = STATUS_ACCEPTED;
    const connection = await ConnectionService.createConnection(
      fromUser,
      user,
      status,
    );

    if (!connection.get('channelSid')) {
      // create a channel between 2 users.
      const channel = await ChatService.createChatChannel(fromUser, uniqueId);
      await ChatService.addMembersToChannel(channel.sid, [
        fromUser.id,
        user.id,
      ]);
      connection.set('channelSid', channel.sid);
      await connection.save(null, { useMasterKey: true });
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
