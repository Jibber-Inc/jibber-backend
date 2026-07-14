import ExtendableError from 'extendable-error-class';
import { v4 as uuidv4 } from 'uuid';
import ChatService from './ChatService';
import ConnectionService from './ConnectionService';
import PushService from './PushService';
import Parse from '../providers/ParseProvider';
import UserUtils from '../utils/userData';
import {
  INTERRUPTION_LEVEL_TYPES,
  STATUS_ACCEPTED,
} from '../constants';

export class ReservationServiceError extends ExtendableError {}

/**
 * Create a reservation
 *
 * @param {Parse.User} user
 */
const createReservation = async user => {
  try {
    const reservation = new Parse.Object('Reservation');
    reservation.set('isClaimed', false);
    reservation.set('createdBy', user);
    // The current clients use objectId as the invitation code, but the live
    // legacy schema still requires both fields on every Reservation.
    reservation.set('position', Date.now());
    reservation.set('code', uuidv4());
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

const checkReservation = async (reservationId, claimingUser) => {
  if (!reservationId) {
    throw new Error('reservation id is required');
  }
  let reservation;
  try {
    reservation = await new Parse.Query('Reservation').get(reservationId, {
      useMasterKey: true,
    });
    const claimedUser = reservation.get('user');
    if (
      reservation.get('isClaimed') &&
      (!claimingUser || !claimedUser || claimedUser.id !== claimingUser.id)
    ) {
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
    const reservation = await checkReservation(reservationId, user);
    // set reservation as claimed and create a connection between users
    if (!reservation.get('isClaimed')) {
      reservation.set('isClaimed', true);
      reservation.set('user', user);
      await reservation.save(null, { useMasterKey: true });
    }
    const conversationCid = reservation.get('conversationCid');

    if (conversationCid) {
      const conversation = await ChatService.getConversationByCid(
        conversationCid,
      );

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
  const reservationOwner = reservation.get('createdBy');

  if (!(reservationOwner instanceof Parse.User)) {
    throw new ReservationServiceError(
      'Reservation creator could not be found.',
    );
  }

  await ConnectionService.createConnection(
    reservationOwner,
    user,
    STATUS_ACCEPTED,
    reservationId,
  );

  const conversationCid = reservation.get('conversationCid');
  let conversation;

  if (!conversationCid) {
    const fromUser = reservationOwner;
    const toUser = user;
    const conversationId = `conv_${fromUser.id}_${toUser.id}`;
    conversation = await ChatService.createConversation(
      fromUser,
      conversationId,
      'messaging',
      conversationId,
      [fromUser.id, toUser.id],
      { trustedLegacyContextKey: true },
    );
    reservation.set('conversationCid', conversation.id);
    await reservation.save(null, { useMasterKey: true });
  } else {
    conversation = await ChatService.getConversationByCid(conversationCid);
  }

  const fromUser = await new Parse.Query(Parse.User).get(
    conversation.get('creator').id,
    { useMasterKey: true },
  );
  const toFullName = UserUtils.getFullName(user);

  if (conversation) {
    const data = {
      messageId: null,
      conversationCid: conversation.id,
      title: `${toFullName} claimed your reservation! 🥳`,
      body: `${toFullName} accepted your invitation and was added to a conversation with you.`,
      target: 'conversation',
      category: 'connection.new',
      interruptionLevel: INTERRUPTION_LEVEL_TYPES.TIME_SENSITIVE,
      threadId: conversation.id,
      author: fromUser.id,
    };

    await PushService.sendPushNotificationToUsers(data, [fromUser]);
  }
};

export default {
  createReservations,
  createReservation,
  checkReservation,
  hasReservations,
  claimReservation,
  handleReservation,
};
