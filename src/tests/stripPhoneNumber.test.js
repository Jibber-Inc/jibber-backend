import stripPhoneNumber from '../utils/stripPhoneNumber';



describe('test stripPhoneNumber', () => {

  test.each([
    ['+1-206-123-4567', '12061234567'],
    ['+1 (206) 123-4567', '12061234567'],
    ['206-123-4567', '2061234567'],
    ['206.123.4567', '2061234567'],
    ['☘️206--=123😎456🎲7', '2061234567'],
  ])(
    'removes everything but valid numbers',
    (input, expected) => {
      expect(stripPhoneNumber(input))
        .toEqual(expected);
    }
  );

  it('should throw error if phone number type is not a string', () => {
    expect(() => stripPhoneNumber(2061234567)).toThrow();
    expect(() => stripPhoneNumber({ phone: 2061234567 })).toThrow();
    expect(() => stripPhoneNumber(null)).toThrow();
    expect(() => stripPhoneNumber()).toThrow();
    expect(() => stripPhoneNumber(undefined)).toThrow();
    expect(() => stripPhoneNumber([])).toThrow();
  });
});

