

/**
 * EventType - string - Always onMessageUpdated
 * MessageSid - string - The Message SID of the updated Message
 * Index - int
 *       - The index of the updated Message within the Channel Message list
 * ChannelSid - string
 *            - SID identifier of the Channel the Message is being sent to
 * Body - string - The body of message
 * Attributes - string, optional, valid JSON structure or null
 *            - Stringified JSON structure. This can be null if attributes are
 *              not present in message entity
 * From - string - The author of the message
 * ModifiedBy - string - The identity of the user that updated the message
 * DateCreated - date string - The timestamp of message creation
 * DateUpdated - date string - The timestamp of update of the message
 */
const onMessageUpdated = (request, response) => {
  return response
    .status(200)
    .json({});
};

export default onMessageUpdated;
