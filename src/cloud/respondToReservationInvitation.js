import ReservationService from '../services/ReservationService';

const respondToReservationInvitation = request =>
  ReservationService.respondToInvitation(
    request.params.reservationId,
    request.params.decision,
  );

export default respondToReservationInvitation;
