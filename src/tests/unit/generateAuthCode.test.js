import generateAuthCode from '../../utils/generateAuthCode';


describe('test generateAuthCode function', () => {

  it('should always return a string', () => {
    const auth_code = generateAuthCode();
    [...Array(100)].forEach(() =>
      expect(typeof auth_code).toBe('string'));
  });

  it('should always return string with length of 4', () => {
    [...Array(100)].forEach(() =>
      expect(generateAuthCode().length).toBe(4));
  });

});
