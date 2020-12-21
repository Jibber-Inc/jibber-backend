import Parse from '../../providers/ParseProvider';
import Twilio from '../../providers/TwilioProvider';
import PushService from '../../services/PushService';
import { NOTIFICATION_TYPES } from '../../constants';

/**
 * EventType - string - Always onMessageSent
 * MessageSid - string - The Message SID of the new Message
 * Index - int - The index of the Message within the Channel Message list
 * ChannelSid - string
 *            - Channel SID identifier of the Channel the Message is being sent
 *              to
 * Body - string - The body of the message
 * Attributes - string, optional, valid JSON structure or null
 *            - Stringified JSON structure. This can be null if attributes are
 *              not present in message entity
 * From - string - The author of the message
 * DateCreated - date string - The timestamp of message creation
 */
const onMessageSent = async (request, response) => {
  const {
    ChannelSid, MessageSid, Body, From, Attributes,
  } = request.body;
  let pushStatus = {};
  try {
    if (!Attributes) throw new Error('No Attributes present on the resquest.');
    const { context } = JSON.parse(Attributes);

    if (context === 'emergency') {
      const membersList = await new Twilio().client.chat
        .services(process.env.TWILIO_SERVICE_SID)
        .channels(ChannelSid)
        .members.list();

      const usersIdentities = membersList
        .map((m) => m.identity)
        .filter((u) => u !== From);
      const users = usersIdentities.map((uid) => Parse.User.createWithoutData(uid));

      if (users.length) {
        const data = {
          messageId: MessageSid,
          channelId: ChannelSid,
          identifier: MessageSid + context,
          title: 'Emergency 🚨',
          body: Body,
          target: 'channel',
        };
        pushStatus = await PushService.sendPushNotificationToUsers(
          NOTIFICATION_TYPES.ALERT_MESSAGE,
          data,
          users,
        );
      }
    }

    return response.status(200).json(pushStatus);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};

export default onMessageSent;
