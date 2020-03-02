import Parse from '../../providers/ParseProvider';


/**
 * After save webhook for Connection objects.
 * @param {Object} request
 */
const reservationBeforeSave = async request => {

  const reservation = request.object;

  if (reservation.isNew()) {
    const ReservationCount = Parse.Object.extend('ReservationCount');
    const countQuery = new Parse.Query(ReservationCount);
    const count = await countQuery
      .first()
      .then(count => {
        count.increment('currentCount');
        return count.save();
      });
    reservation.set('position', count.get('currentCount'));
  }
};


export default reservationBeforeSave;
