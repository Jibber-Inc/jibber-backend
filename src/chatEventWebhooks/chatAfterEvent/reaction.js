/**
 *
 * @param {*} request
 * @param {*} response
 */
const newReaction = (request, response) => {

  console.log('*******************************************');
  console.log('*******************************************');
  console.log('*******************************************');
  console.log('*******************************************');
  console.log('*******************************************');
  console.log('estoy aca ready')
}

/**
 *
 * @param {*} request
 * @param {*} response
 */
const updated = (request, response) => response.status(200).json();

/**
 *
 * @param {*} request
 * @param {*} response
 */
const deleted = (request, response) => response.status(200).json();

export default {
  new: newReaction,
  updated,
  deleted,
};
