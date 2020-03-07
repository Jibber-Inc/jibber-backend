import generateReservationCode from '../../utils/generateReservationCode';



describe('test generateReservationCode utility function', () => {

  /** case: check string length */
  it('should return string of length 8', () => {
    expect(generateReservationCode().length).toBe(8);
  });

  /** case: check value differs */
  test.each([...Array(20)]
    .map(() =>
      [ generateReservationCode(), generateReservationCode() ]
    ))(
    '%p !== %p',
    (arg1, arg2) => expect(arg1).not.toBe(arg2)
  );
});
