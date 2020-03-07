

/**
 * EventType - string - Always onChannelAdded
 * ChannelSid - string - The SID of the newly added Channel
 * Attributes - string, optional, JSON structure
 *            - The arbitrary JSON structure of the channel
 * DateCreated - date string - The date of channel creation
 * CreatedBy - string - The identity of the user that created a channel
 * FriendlyName - string, optional - The friendly name of the channel, if set
 * UniqueName - string, optional - The unique name of the channel, if set
 * ChannelType - string - The Channel type. Either private or public
 */
const onChannelAdded = (request, response) => {
  return response
    .status(200)
    .json({});
};

export default onChannelAdded;
