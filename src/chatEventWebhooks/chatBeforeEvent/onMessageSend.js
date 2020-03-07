
/**
 * EventType - string - Always onMessageSend
 * ChannelSid - string - Channel SID identifier of the Channel the Message is being sent to
 * Body - string - The body of message
 * Attributes - string, optional, valid JSON structure or null
 *            - A JSON structure contained in a string. This can be null if
 *              attributes are not present in message entity.
 * From - string - The author of the message
 *
 */
const onMessageSend = (request, response) => {
  return response
    .status(200)
    .json({});
};

export default onMessageSend;
