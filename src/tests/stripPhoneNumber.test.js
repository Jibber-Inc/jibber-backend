import stripPhoneNumber from '../utils/stripPhoneNumber';
import { ArgumentTypeError } from '../errors';


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
    expect(() => stripPhoneNumber(2061234567)).toThrow(ArgumentTypeError);
    expect(() => stripPhoneNumber({ phone: '2061234567' })).toThrow(ArgumentTypeError);
    expect(() => stripPhoneNumber()).toThrow(ArgumentTypeError);
    expect(() => stripPhoneNumber(null)).toThrow(ArgumentTypeError);
    expect(() => stripPhoneNumber(undefined)).toThrow(ArgumentTypeError);
    expect(() => stripPhoneNumber([])).toThrow(ArgumentTypeError);
  });
});

