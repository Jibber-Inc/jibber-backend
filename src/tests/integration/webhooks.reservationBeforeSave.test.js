import Parse from '../../providers/ParseProvider';
import generateReservationLink from '../../utils/generateReservationLink';



describe('test reservationBeforeSave webhook', () => {

  /** case: creating new reservation */
  it('creates and sets reservation "code" field', async () => {
    expect.assertions(2);

    const Reservation = Parse.Object.extend('Reservation');
    const reservation = new Reservation();

    expect(reservation.get('code')).toBe(undefined);

    return reservation
      .save()
      .then(reservation =>
        expect(reservation.get('code').length)
          .toBe(8));
  });

  /** case: creating new reservation */
  it('creates and sets reservation "link" field', async () => {
    expect.assertions(2);

    const Reservation = Parse.Object.extend('Reservation');
    const reservation = new Reservation();

    expect(reservation.get('link')).toBe(undefined);

    return reservation
      .save()
      .then(reservation =>
        expect(reservation.get('link'))
          .toBe(generateReservationLink(reservation.get('code'))));
  });

});
