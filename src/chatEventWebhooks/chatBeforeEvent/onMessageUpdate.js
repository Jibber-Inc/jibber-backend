
/**
 * EventType - string - Always onMessageUpdate
 * MessageSid - string - The Message SID
 * ChannelSid - string
 *            - SID identifier of the Channel the Message is being sent to
 * Body - string - The body of message
 * Attributes - string, optional, valid JSON structure or null
 *            - Stringified JSON structure. This can be null if attributes are
 *              not present in message entity
 * From - string - The author of the message
 * DateCreated - date string - The timestamp from message creation
 * ModifiedBy - string - The updater/modifier of the message
 */
const onMessageUpdate = (request, response) => {
  return response
    .status(200)
    .json({});
};

export default onMessageUpdate;
