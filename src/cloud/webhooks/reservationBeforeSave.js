import Parse from '../../providers/ParseProvider';
import generateReservationCode from '../../utils/generateReservationCode';
import generateReservationLink from '../../utils/generateReservationLink';

/**
 * After save webhook for Reservation objects.
 * @param {Object} request
 */
const reservationBeforeSave = async request => {
  const reservation = request.object;

  // Auto increment position if new reservation
  if (reservation.isNew()) {
    const ReservationCount = Parse.Object.extend('ReservationCount');
    const countQuery = new Parse.Query(ReservationCount);
    const count = await countQuery.first().then(count => {
      count.increment('currentCount');
      return count.save();
    });
    reservation.set('position', count.get('currentCount'));
  }

  // Set "code" field if not already set
  if (!reservation.get('code')) {
    // @todo: Code is not guaranteed to be unique -- but most likey will be
    // We might want to handle edge case in code of these values colliding
    // Although, mongo db managed index "code" already enforces unique values.
    reservation.set('code', generateReservationCode());
  }

  // Set link property
  const link = generateReservationLink(reservation.get('code'));
  if (reservation.get('link') !== link) {
    reservation.set('link', link);
  }
};

export default reservationBeforeSave;
