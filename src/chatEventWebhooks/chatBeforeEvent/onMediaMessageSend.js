/**
 * EventType - string - Always onMediaMessageSend
 * ChannelSid - string
 *            - Channel SID identifier of the Channel the Message is being sent
 *              to
 * Body - string - The body of message
 * Attributes - string, optional, valid JSON structure or null
 *            - A JSON structure contained in a string. This can be null if
 *              attributes are not present in message entity.
 * From - string - The author of the message
 * MediaFilename - string
 *               - The filename of the underlying media file as specified when
 *                 uploaded
 * MediaContentType - string - The MIME type of the file this media represents.
 * MediaSid - string - Media SID identifier
 * MediaSize - int - Media size in bytes
 */
const onMediaMessageSend = (request, response) => response.status(200).json({});

export default onMediaMessageSend;
