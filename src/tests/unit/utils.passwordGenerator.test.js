import passwordGenerator from '../../utils/passwordGenerator';

const {
  BENJI_SECRET_PASSWORD_TOKEN,
} = process.env;


describe('test passwordGenerator function', () => {

  it('should return a string', () => {
    const auth_code = 1234;
    expect(typeof passwordGenerator(auth_code))
      .toBe('string');
  });

  it('should be length of token length plus auth code length', () => {
    const auth_code = 1234;
    const expected_length = BENJI_SECRET_PASSWORD_TOKEN.length + String(auth_code).length;
    expect(passwordGenerator(auth_code).length)
      .toBe(expected_length);
  });
});

