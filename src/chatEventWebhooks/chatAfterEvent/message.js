import Parse from '../../providers/ParseProvider';
import UserUtils from '../../utils/userData';
import PushService from '../../services/PushService';
import EventWrapper from '../../utils/eventWrapper';

const getInterruptionLevel = (context, focusSatus) => {
  if (context === 'time-sensitive') {
    return 'time-sensitive';
  }

  if (focusSatus === 'focused') {
    return 'passive';
  }

  return 'active';
};

/**
 *
 * @param {*} request
 * @param {*} response
 */
const newMessage = async (request, response) => {
  const { conversationId, conversationCid, message, user, members } = EventWrapper.getParams(
    request.body,
  );
  
  console.log('AA')
  // TODO: Use attributes
  const fromUser = await new Parse.Query(Parse.User).get(message.user.id);

  const connection  = await new Parse.Query('Connection').equalTo('channelSId', conversationCid).find({useMasterKey: true});
  const connectionId = connection && connection.length && connection[0].id || null

  try {
    const { context } = message;
    console.log('BB')
    const usersIdentities = members
      .map(m => m.user_id)
      .filter(u => u !== user.id);

    const users = usersIdentities.map(uid => Parse.User.createWithoutData(uid));
    console.log('CC')
    if (users.length && context === 'emergency') {
      // Set the data for the alert message Notice object
      /* const noticeData = {
        type: NOTIFICATION_TYPES.ALERT_MESSAGE,
        body: message.text,
        attributes: {
          channelId: conversationId,
          messageId: message.id,
          author: user.id,
        },
        priority: 1,
        fromUser,
      }; */
      // Create the Notice object
     // await NoticeService.createNotice(noticeData);
      console.log('DD')
      // Set the data for the alert message push notification
      const fullName = UserUtils.getFullName(fromUser);
      const data = {
        messageId: message.id,
        channelId: conversationId,
        conversationId: conversationCid,
        identifier: message.id + context,
        title: `🚨 ${fullName}`,
        body: message.text,
        target: 'channel',
        category: 'message.new',
        interruptionLevel: getInterruptionLevel(message.context, fromUser.focusSatus ),
        threadId: conversationCid,
        author: fromUser.id,
        connectionId,
      };
      console.log('EE')
      // Send the push notification
      await PushService.sendPushNotificationToUsers(
        data,
        users,
      );
    }

    return response.status(200).json();
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};
/*
{
  "aps" : {
  
      "thread-id": "{{ channel.cid }}",
      "category": "NEW_MESSAGE",
      "interruption-level": "{{ message.context }}",
      "mutable-content": 1
  },
  "data": {
      "target": "conversation",
      "conversationId": "{{ channel.cid }}",
      "messageId": "{{ message.id }}",
      "author": "{{ sender.id }}"
  },
  "stream": {
      "target": "conversation",
      "sender": "stream.chat",
      "type": "message.new",
      "version": "v1",
      "author": "{{ sender.id }}",
      "id": "{{ message.id }}",
      "cid": "{{ channel.cid }}"
  }
}
*/
/**
 *
 * @param {*} request
 * @param {*} response
 */
const read = (request, response) => response.status(200).json();

/**
 *
 * @param {*} request
 * @param {*} response
 */
const updated = (request, response) => {
  try {
    // let pushStatus = {};
    // const {
    //   conversationId,
    //   message,
    //   user,
    // } = EventWrapper.getParams(request.body);

    // // if (!Attributes) throw new Error('No Attributes present on the resquest.');
    // // const { consumers = [], context = '' } = JSON.parse(Attributes);
    // const consumers = [];
    // const context = 'emergency';
    // // Get the Parse.Users for author and reader
    // const [author, reader] = await Promise.all([
    //   new Parse.Query(Parse.User).get(message.user.id, { useMasterKey: true }),
    //   new Parse.Query(Parse.User).get(user.id, {
    //     useMasterKey: true,
    //   }),
    // ]);

    // // If the messages has emergency context,
    // // FIXME: Consumers array && context
    // // send a push notification that it has been read
    // if (context === 'emergency') {
    // // if (consumers.includes(ModifiedBy) && context === 'emergency') {
    //   const body = `${reader.get('giveName')} ${reader.get(
    //     'familyName',
    //   )} read: ${message.text}`;
    //   const data = {
    //     messageId: message.id,
    //     channelId: conversationId,
    //     identifier: `${conversationId}read${reader.id}`,
    //     title: 'Message Read 🤓',
    //     body,
    //     target: 'channel',
    //   };
    //   pushStatus = await PushService.sendPushNotificationToUsers(
    //     data,
    //     [author],
    //   );
    // }

    // return response.status(200).json(pushStatus);
    return response.status(200).json();
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};

/**
 *
 * @param {*} request
 * @param {*} response
 */
const deleted = (request, response) => response.status(200).json();

/**
 *
 * @param {*} request
 * @param {*} response
 */
const flagged = (request, response) => response.status(200).json();

/**
 *
 * @param {*} request
 * @param {*} response
 */
const unflagged = (request, response) => response.status(200).json();

export default {
  new: newMessage,
  read,
  updated,
  deleted,
  flagged,
  unflagged,
};
