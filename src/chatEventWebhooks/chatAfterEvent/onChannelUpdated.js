
import ChatService from '../../services/ChatService';

/**
 * EventType - string - Always onChannelUpdated
 * ChannelSid - string - Channel String Identifier
 * Attributes - string, optional, JSON structure
 *            - The arbitrary JSON structure of the channel
 * DateCreated - date string, - The date of creation of the channel
 * DateUpdated - date string - The date of update of the channel
 * CreatedBy - string - The identity of the user that created a channel
 * FriendlyName - string, optional - The friendly name of the channel, if set
 * UniqueName - string, optional - The unique name of the channel, if set
 * ChannelType - string - The Channel type. Either private or public
 */
const onChannelUpdated = async (request, response) => {
  const { ChannelSid } = request.body;
  try {
    const channel = await ChatService.fetchChannel(ChannelSid);

    return response.status(200).json(channel);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};

export default onChannelUpdated;
