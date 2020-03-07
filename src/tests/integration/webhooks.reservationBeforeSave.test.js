import Parse from '../../providers/ParseProvider';



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
});

