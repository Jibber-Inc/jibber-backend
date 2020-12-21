/**
 * EventType - string - Always onChannelUpdate
 * ChannelSid - string - Channel String Identifier
 * Attributes - string, optional, valid JSON structure or null
 *            - Stringified JSON structure. This can be null if attributes are
 *              not present in channel entity.
 * DateCreated - date string, - The date of creation of the channel
 * CreatedBy - string - The identity of the user that created a channel
 * FriendlyName - string, optional - The friendly name of the channel, if set
 * UniqueName - string, optional - The unique name of the channel, if set
 */
const onChannelUpdate = (request, response) => response.status(200).json({});

export default onChannelUpdate;
