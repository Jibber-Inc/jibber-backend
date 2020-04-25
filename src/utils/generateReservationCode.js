/**
 * Generate a random string with 8 chars length
 * @returns {String}
 */
const generateReservationCode = () =>
  [...Array(8)].map(() => (~~(Math.random() * 36)).toString(36)).join('');

export default generateReservationCode;
