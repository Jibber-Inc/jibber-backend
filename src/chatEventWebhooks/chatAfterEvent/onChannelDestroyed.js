/**
 * EventType - string - Always onChannelDestroyed
 * ChannelSid - string - Channel String Identifier
 * Attributes - string, optional, JSON structure
 *            - The arbitrary JSON structure of the channel
 * DateCreated - date string, - The date of creation of the channel
 * DateDestroyed - date string, - The date of destruction of the channel
 * CreatedBy - string - The identity of the user that created a channel
 * FriendlyName - string, optional - The friendly name of the channel, if set
 * UniqueName - string, optional - The unique name of the channel, if set
 * ChannelType - string - The Channel type. Either private or public
 */
const onChannelDestroyed = (request, response) => {
  return response.status(200).json({});
};

export default onChannelDestroyed;
