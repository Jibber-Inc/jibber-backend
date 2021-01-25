import ExtendableError from 'extendable-error-class';
import ChatService from '../../services/ChatService';
import Parse from '../../providers/ParseProvider';

class OnMemberRemovedError extends ExtendableError {}
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
    const user = await new Parse.Query(Parse.User).get(Identity);

    if (!(user instanceof Parse.User)) {
      throw new OnMemberRemovedError('[zIslmc6c] User not found');
    }

    // Create message structure
    const message = {
      body: `[${user.get('handle')}](${Identity}) left the conversation.`,
      attributes: JSON.stringify({ context: 'status' }),
    };

    // Send the message
    const result = await ChatService.createMessage(message, ChannelSid);
    return response.status(200).json({ messageSid: result.sid });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};

export default onMemberRemoved;
