import Parse from '../../providers/ParseProvider';
import ChatService from '../../services/ChatService';
import PushService from '../../services/PushService';
import { NOTIFICATION_TYPES } from '../../constants';

/**
 * EventType - string - Always onMessageUpdated
 * MessageSid - string - The Message SID of the updated Message
 * Index - int
 *       - The index of the updated Message within the Channel Message list
 * ChannelSid - string
 *            - SID identifier of the Channel the Message is being sent to
 * Body - string - The body of message
 * Attributes - string, optional, valid JSON structure or null
 *            - Stringified JSON structure. This can be null if attributes are
 *              not present in message entity
 * From - string - The author of the message
 * ModifiedBy - string - The identity of the user that updated the message
 * DateCreated - date string - The timestamp of message creation
 * DateUpdated - date string - The timestamp of update of the message
 */
const onMessageUpdated = async (request, response) => {
  try {
    let pushStatus = {};
    const {
      ChannelSid,
      MessageSid,
      Attributes,
      From,
      ModifiedBy,
    } = request.body;

    if (!Attributes) throw new Error('No Attributes present on the resquest.');

    const { consumers = [], context = '' } = JSON.parse(Attributes);
    if (consumers.includes(ModifiedBy) && context === 'emergency') {
      const [author, reader] = await Promise.all([
        new Parse.Query(Parse.User).get(From, { useMasterKey: true }),
        new Parse.Query(Parse.User).get(ModifiedBy, {
          useMasterKey: true,
        }),
      ]);

      const channel = await ChatService.fetchChannel(ChannelSid);
      const username = `${reader.get('givenName')} ${reader.get('familyName')}`;
      const body = `${username} read your message in ${channel.friendlyName}`;
      const data = {
        messageId: MessageSid,
        channelId: ChannelSid,
        identifier: `${ChannelSid}read${reader.id}`,
        title: 'Message Read 🤓',
        body,
        target: 'channel',
      };
      pushStatus = await PushService.sendPushNotificationToUsers(
        NOTIFICATION_TYPES.MESSAGE_READ,
        data,
        [author],
      );
    }
    return response.status(200).json(pushStatus);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};

export default onMessageUpdated;
