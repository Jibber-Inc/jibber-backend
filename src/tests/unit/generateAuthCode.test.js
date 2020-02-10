import generateAuthCode from '../../utils/generateAuthCode';


describe('test generateAuthCode function', () => {

  it('should always return a number', () => {
    const auth_code = generateAuthCode();
    [...Array(100)].forEach(() =>
      expect(typeof auth_code).toBe('number'));
  });

  it('should always return a 4 digit number', () => {
    [...Array(100)].forEach(() =>
      expect(String(generateAuthCode()).length).toBe(4));
  });

});
