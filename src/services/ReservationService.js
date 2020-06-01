import Parse from '../providers/ParseProvider';
import ConnectionService from './ConnectionService';
import ChatService from './ChatService';
import ExtendableError from 'extendable-error-class';
import generateReservationLink from '../utils/generateReservationLink';
import db from '../utils/db';
import hat from 'hat';

export class ReservationServiceError extends ExtendableError {}

/**
 * Create a reservation
 *
 * @param {Parse.User} user
 */
const createReservation = async user => {
  try {
    const reservation = new Parse.Object('Reservation');
    const reservationCount = await db.getValueForNextSequence('reservation');
    reservation.set('position', reservationCount);
    reservation.set('isClaimed'.false);
    reservation.set('createdBy', user);
    reservation.setACL(new Parse.ACL(user));
    await reservation.save(null, { useMasterKey: true });
    reservation.set('reservationLink', generateReservationLink(reservation.id));
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
    const config = await Parse.Config.get();
    // get reservation length from Parse Configuration
    const maxReservationsLength = config.get('maxReservations');
    // Count actual reservation count.
    const reservationsCount = await new Parse.Query('Reservation').count();
    const availableReservations = maxReservationsLength - reservationsCount;

    // number of required reservations are available
    if (availableReservations >= number) {
      return Promise.all([...Array(number)].map(() => createReservation(user)));
    } else {
      //  create available slots. If available = 0, map won't iterate array.
      return Promise.all(
        [...Array(availableReservations)].map(() => createReservation(user)),
      );
    }
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
    await ConnectionService.createConnection(fromUser, user);
    const uniqueId = hat();
    // create a channel between 2 users.
    const channel = await ChatService.createChatChannel(
      fromUser,
      uniqueId,
      user.get('givenName'),
    );
    await ChatService.addMembersToChannel(channel.sid, [fromUser]);
  } catch (error) {
    throw new ReservationServiceError(`Reservation cannot be claimed. Detail: ${error.message}`);
  }
};

export default {
  createReservations,
  createReservation,
  checkReservation,
  hasReservations,
  claimReservation,
};
