import Parse from '../../providers/ParseProvider';
import ExtendableError from 'extendable-error-class';
import createHandle from '../../utils/createHandle';


class UserBeforeSaveError extends ExtendableError {}



/**
 * After save webhook for Connection objects.
 * @param {Object} request
 */
const userBeforeSave = async request => {
  const user = request.object;

  if (!user) {
    throw new UserBeforeSaveError(
      '[iHkt4G3p] Expected user in request.object'
    );
  }

  // Update reservation property on user
  const reservation = user.get('reservation');
  if (!!reservation) {

    // Query for reservation object
    const Reservation = Parse.Object.extend('Reservation');
    let reservationQuery = new Parse.Query(Reservation);
    reservationQuery.equalTo('objectId', reservation.id);
    return reservationQuery.first()

      // Update reservation "isClaimed" = true
      .then(reservation => {
        if (!reservation.get('isClaimed')) {
          reservation.set('isClaimed', true);
          return reservation.save();
        }
        return reservation;
      })

      // Update user handle
      .then(reservation => {
        if (!user.get('handle') && !!reservation) {
          const position = reservation.get('position');
          const phoneNumber = user.get('phoneNumber');
          const givenName = user.get('givenName');
          const familyName = user.get('familyName');
          if (!!phoneNumber && givenName && familyName) {
            const handle = createHandle(givenName, familyName, position);
            user.set('handle', handle);
          }
        }
      });
  }
};


export default userBeforeSave;
