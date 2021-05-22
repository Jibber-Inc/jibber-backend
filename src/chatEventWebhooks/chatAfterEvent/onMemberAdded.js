import ExtendableError from 'extendable-error-class';
import ChatService from '../../services/ChatService';
import Parse from '../../providers/ParseProvider';
import { ONBOARDING_ADMIN } from '../../constants/index';

class OnMemberRemovedAdded extends ExtendableError {}

/**
 * Creates a message to tell that the recently added member was added
 *
 * @param {*} user
 * @param {*} channel
 *
 * @returns {object} twilio message
 */
const createUserJoinedMessage = async (user, channelSid) => {
  // Create message structure
  const Identity = user.id;
  const handle = user.get('handle');
  const message = {
    body: `[${handle}](${Identity}) joined the conversation.`,
    attributes: JSON.stringify({
      context: 'status',
      updateId: String(new Date().getTime()),
    }),
    from: Identity,
  };
  // Send the message
  const result = await ChatService.createMessage(message, channelSid);
  return result;
};

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
    const { ChannelSid, Identity } = request.body;
    const channel = await ChatService.fetchChannel(ChannelSid);
    const { createdBy } = channel;

    // Retrieve the Parse user of the member just added to the channel
    const user = await new Parse.Query(Parse.User).get(Identity);
    if (!(user instanceof Parse.User)) {
      throw new OnMemberRemovedAdded('[zIslmc6c] User not found');
    }

    // If the user isn't the ONBOARDING_ADMIN,
    // send a message to tell that the user has joined the channel
    let messageSid;
    if (createdBy !== Identity) {
      // Retrieve the role for the user
      const userRole = await new Parse.Query(Parse.Role)
        .equalTo('users', user)
        .first();
      // Check the role
      if (userRole && userRole.get('name') !== ONBOARDING_ADMIN) {
        const message = await createUserJoinedMessage(user, ChannelSid);
        messageSid = message.sid;
      }
    }

    return response.status(200).json({ messageSid });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};

export default onMemberAdded;
