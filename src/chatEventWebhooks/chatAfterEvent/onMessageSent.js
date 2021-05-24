import Parse from '../../providers/ParseProvider';
import PushService from '../../services/PushService';
import ChatService from '../../services/ChatService';
import { NOTIFICATION_TYPES } from '../../constants';
import FeedService from '../../services/FeedService';
import NoticeService from '../../services/NoticeService';
import UserUtils from '../../utils/userData';

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
  const { ChannelSid, MessageSid, Body, From, Attributes } = request.body;
  let pushStatus = {};
  try {
    if (!Attributes) throw new Error('No Attributes present on the resquest.');
    const { context } = JSON.parse(Attributes);
    const membersList = await ChatService.getChannelMembers(ChannelSid);
    const usersIdentities = membersList
      .map(m => m.identity)
      .filter(u => u !== From);
    const users = usersIdentities.map(uid => Parse.User.createWithoutData(uid));

    if (users.length) {
      const fromUser = await new Parse.Query(Parse.User).get(From);
      if (context === 'emergency') {
        // Set the data for the alert message Notice object
        const noticeData = {
          type: NOTIFICATION_TYPES.ALERT_MESSAGE,
          body: Body,
          attributes: {
            channelId: ChannelSid,
            messageId: MessageSid,
          },
          priority: 1,
          fromUser,
        };
        // Create the Notice object
        await NoticeService.createNotice(noticeData);

        // Set the data for the alert message push notification
        const fullName = UserUtils.getFullName(fromUser);
        const data = {
          messageId: MessageSid,
          channelId: ChannelSid,
          identifier: MessageSid + context,
          title: `🚨 ${fullName}`,
          body: Body,
          target: 'channel',
        };
        // Send the push notification
        pushStatus = await PushService.sendPushNotificationToUsers(
          NOTIFICATION_TYPES.ALERT_MESSAGE,
          data,
          users,
        );
      }

      // Increase by 1 the unread messages in all the needed posts if the context is not 'status'
      if (context !== 'status') {
        await FeedService.increasePostUnreadMessages(fromUser, ChannelSid);
      }
    }

    return response.status(200).json(pushStatus);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};

export default onMessageSent;
