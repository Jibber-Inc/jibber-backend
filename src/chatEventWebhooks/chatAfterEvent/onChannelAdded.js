import Parse from '../../providers/ParseProvider';
import ChatService from '../../services/ChatService';

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
const onChannelAdded = async (request, response) => {
  try {
    let { ChannelSid, CreatedBy } = request.body;

    const users = await new Parse.Query(Parse.User)
      .notEqualTo('objectId', CreatedBy)
      .find({ useMasterKey: true });
    const members = users.map(u => u.id);
    await ChatService.addMembersToChannel(ChannelSid, members);
    return response.status(200).json({ membersAdded: members });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};

export default onChannelAdded;
