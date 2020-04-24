/**
 * EventType - string - Always onMediaMessageSent
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
 * MediaFilename - string
 *               - The filename of the underlying media file as specified when
 *                 uploaded
 * MediaContentType - string - The MIME type of the file this media represents.
 * MediaSid - string - Media SID identifier
 * MediaSize - int - Media size in bytes
 */
const onMediaMessageSent = (request, response) => {
  return response.status(200).json({});
};

export default onMediaMessageSent;
