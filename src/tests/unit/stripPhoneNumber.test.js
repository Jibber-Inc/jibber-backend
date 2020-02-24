import stripPhoneNumber from '../../utils/stripPhoneNumber';
import { ArgumentTypeError } from '../../errors';


describe('test stripPhoneNumber', () => {

  /**
   * Should behave as expected
   */
  test.each([
    ['+1-206-123-4567', '12061234567'],
    ['+1 (206) 123-4567', '12061234567'],
    ['206-123-4567', '2061234567'],
    ['206.123.4567', '2061234567'],
    ['☘️206--=123😎456🎲7', '2061234567'],
  ])(
    'given %p return %p',
    (input, expected) => {
      expect(stripPhoneNumber(input))
        .toEqual(expected);
    }
  );

  /**
   * Should throw expected error if given invalid arguments
   */
  test.each([
    [2061234567, ArgumentTypeError],
    [206.1234567, ArgumentTypeError],
    [{ phone: '2061234567' }, ArgumentTypeError],
    [null, ArgumentTypeError],
    [undefined, ArgumentTypeError],
    [[], ArgumentTypeError],
  ])(
    'given %p should throw %p',
    (input, expected) => {
      expect(() => stripPhoneNumber(input)).toThrow(expected);
    }
  );

});

