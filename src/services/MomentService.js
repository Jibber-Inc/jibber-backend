import ExtendableError from 'extendable-error-class';
import { NOTIFICATION_TYPES } from '../constants';
import Parse from '../providers/ParseProvider';

class NoticeServiceError extends ExtendableError {}

/**
 * Creates a Notice object with the given data
 *
 * @param {*} data
 * @returns
 */
const createMoment = async data => {
  const { type, body, attributes, priority, user, toUser } = data;

  const notice = new Parse.Object('Notice');

  notice.set('type', type);
  notice.set('body', body);
  notice.set('attributes', attributes);
  notice.set('priority', priority);
  if(!toUser) {
    notice.setACL(new Parse.ACL(user));
  } else {
    notice.setACL(new Parse.ACL(toUser));
  }
  notice.set('owner', user);

  await notice.save(null, { useMasterKey: true });
  return notice;
};

const getNoticeByOwner = async (user, type) => {
  const notice = await new Parse.Query('Notice')
    .equalTo('owner', user)
    .equalTo('type', type)
    .first({ useMasterKey: true });
  return notice;
};

/**
 * Delete all user reservations
 *
 * @param {Parse.User} user
 */
const deleteNotice = async user => {
  try {
    const query = new Parse.Query('Notice')
      .equalTo('owner', user)
      .equalTo('type', NOTIFICATION_TYPES.UNREAD_MESSAGES);
    const result = await query.first({ useMasterKey: true });

    if (result) {
      await result.destroy({ useMasterKey: true });
    }
  } catch (error) {
    throw new NoticeServiceError(error.message);
  }
};

/**
 * Delete all user reservations
 *
 * @param {Parse.User} user
 */
 const deleteAllNoticeByUser = async user => {
  try {
    const query = new Parse.Query('Notice')
      .equalTo('owner', user);

    const notices = await query.find({ useMasterKey: true });

    const promises = notices.map(notice =>
      notice.destroy({ useMasterKey: true }),
    );
   
    await Promise.all(promises);
  } catch (error) {
    throw new NoticeServiceError(error.message);
  }
};

const createUnreadMessagesNotice = async user => {
  // Check if the user has a UNREAD_MESSAGES Notice
  const notice = await new Parse.Query('Notice')
    .equalTo('owner', user)
    .equalTo('type', NOTIFICATION_TYPES.UNREAD_MESSAGES)
    .first({ useMasterKey: true });
  // If the user doesn't have a UNREAD_MESSASES Notice, create one
  if (!notice) {
    const noticeData = {
      type: NOTIFICATION_TYPES.UNREAD_MESSAGES,
      body: 'You have 0 unread messages',
      attributes: {
        unreadMessages: [],
      },
      priority: 1,
      user,
    };
    await createNotice(noticeData);
  }
};

const createOrUpdateMessageReadNotice = async (user,cid, messageId,userIds) => {
  const notice = await new Parse.Query('Notice')
    .equalTo('owner', user)
    .equalTo('type', NOTIFICATION_TYPES.MESSAGE_READ)
    .equalTo('attributes.cid', cid)
    .equalTo('attributes.messageId', messageId)
    .first({ useMasterKey: true });

  if (!notice) {
    const noticeData = {
      type: NOTIFICATION_TYPES.MESSAGE_READ,
      body: '',
      attributes: {
        cid,
        messageId,
        userIds
      },
      priority: 1,
      user,
    };

    await createNotice(noticeData);
  } else {
    const attributes = notice.get('attributes');

    if (attributes && attributes.userIds) {
      notice.set('attributes', {
        ...attributes,
        userIds,
      });
      await notice.save(null, { useMasterKey: true });
    }
  }
};

const createAlertMessageNotice = async (user, cid, messageId) => {
  const noticeData = {
    type: NOTIFICATION_TYPES.ALERT_MESSAGE,
    body: '',
    attributes: {
      cid,
      messageId,
    },
    priority: 1,
    user,
  };

  await createNotice(noticeData);
};

const deleteConnectionRequestNotice = async (user, connectionId) => {
  try {
    const query = new Parse.Query('Notice')
      .equalTo('owner', user)
      .equalTo('type', NOTIFICATION_TYPES.CONNECTION_REQUEST)
      .equalTo('attributes.connectionId', connectionId);

    const result = await query.first({ useMasterKey: true });

    if (result) {
      await result.destroy({ useMasterKey: true });
    }
  } catch (error) {
    throw new NoticeServiceError(error.message);
  }
};

const deleteAlertMessageNotice = async (user, cid, messageId) => {
  try {
    const query = new Parse.Query('Notice')
      .equalTo('owner', user)
      .equalTo('type', NOTIFICATION_TYPES.ALERT_MESSAGE)
      .equalTo('attributes.cid', cid)
      .equalTo('attributes.messageId', messageId);

    const result = await query.first({ useMasterKey: true });

    if (result) {
      await result.destroy({ useMasterKey: true });
    }
  } catch (error) {
    throw new NoticeServiceError(error.message);
  }
};

export default {
  createNotice,
  getNoticeByOwner,
  deleteNotice,
  createUnreadMessagesNotice,
  createOrUpdateMessageReadNotice,
  deleteConnectionRequestNotice,
  createAlertMessageNotice,
  deleteAlertMessageNotice,
  deleteAllNoticeByUser
};
