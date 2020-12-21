import ChatService from '../../services/ChatService';

/**
 * EventType - string - Always onMemberRemoved
 * ChannelSid - string - Channel String Identifier
 * Identity - string - The Identity of the User being removed from the channel
 * MemberSid - string - The Member SID of member being removed
 * RoleSid - string, optional - The role of removed member
 * Reason - string
 *        - The reason for the removal of the member. Could be REMOVED or LEFT
 * DateCreated - date string - The date of Member addition
 * DateRemoved - date string - The date of Member remo
 */
const onMemberRemoved = async (request, response) => {
  try {
    const { ChannelSid, Identity } = request.body;
    const channel = await ChatService.fetchChannel(ChannelSid);
    const { createdBy } = channel;
    let messageSid;
    if (createdBy !== Identity) {
      // Create message structure
      const message = {
        body: `[name](${Identity}) left the conversation.`,
        attributes: JSON.stringify({ context: 'status' }),
        from: Identity,
      };

      // Send the message
      const result = await ChatService.createMessage(message, ChannelSid);
      messageSid = result.sid;
    }
    return response.status(200).json({ messageSid });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};

export default onMemberRemoved;
