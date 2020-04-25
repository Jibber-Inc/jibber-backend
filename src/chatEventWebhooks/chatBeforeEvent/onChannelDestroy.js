/**
 * EventType - string - Always onChannelDestroy
 * ChannelSid - string - Channel String Identifier
 * Attributes - string, optional, valid JSON structure or null
 *            - Stringified JSON structure. This can be null if attributes are
 *              not present in channel entity
 * DateCreated - string - The date of creation of the channel
 * CreatedBy - date string - The identity of the user that created a channel
 * FriendlyName - string, optional - The friendly name of the channel, if set
 * UniqueName - string, optional - The unique name of the channel, if set
 * ChannelType - string - The Channel type. Either private or public
 */
const onChannelDestroy = (request, response) => {
  return response.status(200).json({});
};

export default onChannelDestroy;
