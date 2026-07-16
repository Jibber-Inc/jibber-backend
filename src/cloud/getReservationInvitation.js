import ReservationService from '../services/ReservationService';

const getReservationInvitation = request =>
  ReservationService.getInvitation(request.params.reservationId);

export default getReservationInvitation;
