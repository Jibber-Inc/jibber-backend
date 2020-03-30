import generatePassword from '../../utils/generatePassword';

const {
  BENJI_SECRET_PASSWORD_TOKEN,
} = process.env;


describe('test generatePassword function', () => {

  it('should return a string', () => {
    const auth_code = 1234;
    expect(typeof generatePassword(auth_code))
      .toBe('string');
  });

  it('should be length of token length plus auth code length', () => {
    const auth_code = 1234;
    const expected_length = BENJI_SECRET_PASSWORD_TOKEN.length + String(auth_code).length;
    expect(generatePassword(auth_code).length)
      .toBe(expected_length);
  });
});

