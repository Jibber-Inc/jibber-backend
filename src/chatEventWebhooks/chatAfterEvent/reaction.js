/**
 *
 * @param {*} request
 * @param {*} response
 */
const newReaction = (request, response) => response.status(200).json(

  //channelId
  //messageId

  const { conversationId, conversationCid, message, user, members } = EventWrapper.getParams(
    
  );


);

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
