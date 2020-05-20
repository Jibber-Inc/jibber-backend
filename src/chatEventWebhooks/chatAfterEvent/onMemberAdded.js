import ChatService from '../../services/ChatService';

/**
 * EventType - string - Always onMemberAdded
 * MemberSid - string - The Member SID of the newly added Member
 * ChannelSid - string - Channel String Identifier
 * Identity - string
 *          - The Identity of the User being added to the channel as a Member
 * RoleSid - string, optional - The Role SID of added member
 * Reason - string
 *        - The reason for the addition of the member. Could be ADDED or JOINED
 * DateCreated - date string - The date of Member addition
 */
const onMemberAdded = async (request, response) => {
  try {
    let { ChannelSid, Identity } = request.body;
    const channel = await ChatService.fetchChannel(ChannelSid);
    const { createdBy } = channel;
    let messageSid;
    if (createdBy !== Identity) {
      // Create message structure
      const message = {
        body: `[name](${Identity}) joined the conversation.`,
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

export default onMemberAdded;
