/**
 * EventType - string - Always onMessageRemoved
 * MessageSid - string - The Message SID of the removed Message
 * Index - int
 *       - The index of the removed Message within the Channel Message list
 * ChannelSid - string
 *            - The SID identifier of the Channel the Message is being sent to
 * Body - string - The body of message
 * Attributes - string, optional, valid JSON structure or null
 *            - Stringified JSON structure. This can be null if attributes are
 *              not present in message entity
 * From - string - The author of the message
 * RemovedBy - string - The remover of the message
 * DateCreated - date string - The timestamp of message creation
 * DateRemoved - date string - The timestamp of removal of the message
 */
const onMessageRemoved = (request, response) => response.status(200).json({});

export default onMessageRemoved;
