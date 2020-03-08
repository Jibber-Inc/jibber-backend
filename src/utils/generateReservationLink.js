import ExtendableError from 'extendable-error-class';


class GenerateReservationLinkError extends ExtendableError {}


/**
 * Generate link for reservation object
 * @param {String} code
 * @returns {String}
 */
const generateReservationLink = code => {
  if (!code || typeof code !== 'string') {
    throw new GenerateReservationLinkError('[zs+jwaFE] expected code arg');
  }

  const {
    BRANCH_URL,
  } = process.env;

  return `${ BRANCH_URL || 'https://3996z.app.link' }/?code=${ code }`;
};


export default generateReservationLink;
