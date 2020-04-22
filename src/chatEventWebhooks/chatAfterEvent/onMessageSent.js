/**
 * EventType - string - Always onMessageSent
 * MessageSid - string - The Message SID of the new Message
 * Index - int - The index of the Message within the Channel Message list
 * ChannelSid - string
 *            - Channel SID identifier of the Channel the Message is being sent
 *              to
 * Body - string - The body of the message
 * Attributes - string, optional, valid JSON structure or null
 *            - Stringified JSON structure. This can be null if attributes are
 *              not present in message entity
 * From - string - The author of the message
 * DateCreated - date string - The timestamp of message creation
 */
const onMessageSent = (request, response) => {
  return response.status(200).json({});
};

export default onMessageSent;
