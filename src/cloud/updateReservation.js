import ReservationService from '../services/ReservationService';

/**
 * Updates a reservation
 *
 * @param {Parse.User} user
 */
const updateReservation = async request => {
  const { params, user } = request;
  const { reservationId, isClaimed } = params;

  try {
    if (isClaimed) {
      await ReservationService.claimReservation(reservationId, user);
    }
    return true;
  } catch (error) {
    return error;
  }
};

export default {
  updateReservation,
};
