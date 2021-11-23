/**
 *
 * @param {*} request
 * @param {*} response
 */
const added = (request, response) => response.status(200).json();

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
const removed = (request, response) => response.status(200).json();

export default {
  added,
  updated,
  removed,
};
