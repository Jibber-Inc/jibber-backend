// Vendor
import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
// Constants
import {
  UNREADMESSAGES_POST_TYPE,
  GENERAL_UNREADMESSAGES_POST_TYPE,
  INCREASE_UNREAD_MESSAGES,
  DECREASE_UNREAD_MESSAGES,
} from '../constants/index';
// Utils
import db from '../utils/db';

class FeedServiceError extends ExtendableError {}

/**
 * Creates the feed object for the given user
 */
const createFeedForUser = async user => {
  try {
    let feed = await new Parse.Query('Feed').equalTo('user', user).first();
    if (!feed) {
      feed = new Parse.Object('Feed');
      feed.setACL(new Parse.ACL(user));
      feed.set('user', user);
      feed.save(null, { userMasterKey: true });
    }
    return feed;
  } catch (error) {
    throw new FeedServiceError(error.message);
  }
};

/**
 * Creates a post with the given data
 *
 * @param {*} data
 */
const createPost = data => {
  const {
    type,
    priority,
    body,
    expirationDate = null,
    triggerDate = null,
    subject,
    author,
    attributes,
  } = data;
  try {
    const post = new Parse.Object('Post');
    post.set('type', type);
    post.set('priority', priority);
    post.set('body', body);
    post.set('expirationDate', expirationDate);
    post.set('triggerDate', triggerDate);
    post.set('subject', subject);
    post.set('author', author);
    post.set('attributes', attributes);
    post.save(null, { userMasterKey: true });
    return post;
  } catch (error) {
    throw new FeedServiceError(error.message);
  }
};

/**
 * Creates the post for the unread messages for the recently added member
 *
 * @param {*} user
 * @param {*} channel
 */
const createUnreadMessagesPost = async (user, channel) => {
  try {
    // Check if the post already exists
    let unreadMessagesPost = await new Parse.Query('Post')
      .equalTo('type', 'unreadMessages')
      .equalTo('attributes.channelSid', channel.sid)
      .equalTo('author', user)
      .first();
    if (!unreadMessagesPost) {
      // Create the post structure
      const postData = {
        type: 'unreadMessages',
        priority: 1,
        body: `You have (0) unread message/s in the conversation: (${channel.friendlyName}).`,
        expirationDate: null,
        triggerDate: null,
        subject: '',
        author: user,
        attributes: {
          numberOfUnread: 0,
          channelSid: channel.sid,
        },
      };
      // Create the post
      unreadMessagesPost = await createPost(postData);
    }
    return unreadMessagesPost;
  } catch (error) {
    throw new FeedServiceError(error.message);
  }
};

/**
 * Creates a post to be user for the general unread messages info
 *
 * @param {*} user
 */
const createGeneralUnreadMessagesPost = async user => {
  try {
    // Check if the post already exists
    let generalUnreadMessagesPost = await new Parse.Query('Post')
      .equalTo('type', GENERAL_UNREADMESSAGES_POST_TYPE)
      .equalTo('author', user)
      .first();
    // If no general post, create one
    if (!generalUnreadMessagesPost) {
      // Create the post structure
      const postData = {
        type: 'generalUnreadMessages',
        priority: 1,
        body: `You have (0) unread message/s.`,
        expirationDate: null,
        triggerDate: null,
        subject: '',
        author: user,
        attributes: {
          numberOfUnread: 0,
        },
      };
      generalUnreadMessagesPost = await createPost(postData);
    }
    return generalUnreadMessagesPost;
  } catch (error) {
    throw new FeedServiceError(error.message);
  }
};

/**
 * Retrieves all the post with type = UNREADMESSAGES_POST_TYPE
 * and updates the unreadMessages attribute (increase or decrease)
 *
 * @param {*} type
 * @param {*} channelsid
 */
const updatePostUnreadMessages = async (type, channelsid) => {
  // Get all unreadMessages posts for the channel
  const unreadMessagesPosts = await new Parse.Query('Post')
    .equalTo('type', UNREADMESSAGES_POST_TYPE)
    .equalTo('attributes.channelSid', channelsid)
    .first();
  // Update (increase/decrese) by 1 the unreadMessages counter
  if (unreadMessagesPosts.length) {
    unreadMessagesPosts.forEach(urmp => {
      if (type === INCREASE_UNREAD_MESSAGES) {
        db.getValueForNextSequence(`unreadMessages_${urmp.id}`)
          .then(numberOfUnread => {
            urmp.set('attributes.numberOfUnread', numberOfUnread);
            urmp.save(null, { useMasterKey: true });
          })
          .catch(error => {
            throw new FeedServiceError(error.message);
          });
      }
      // TODO: Decrease (needs implementation)
      if (type === DECREASE_UNREAD_MESSAGES) {
        db.getPreviousValueForSequence(`unreadMessages_${urmp.id}`)
          .then(numberOfUnread => {
            if (numberOfUnread) {
              urmp.set('attributes.numberOfUnread', numberOfUnread);
              urmp.save(null, { useMasterKey: true });
            }
          })
          .catch(error => {
            throw new FeedServiceError(error.message);
          });
      }
    });
  }
};

/**
 * Retrieves all the post with type = GENERAL_UNREADMESSAGES_POST_TYPE
 * and updates the unreadMessages attribute (increase or decrease)
 *
 * @param {*} type
 * @param {*} channelsid
 */
const updateGeneralPostUnreadMessage = async (type, channelsid) => {
  // Get all the generalUnreadMessages post for the channel
  const generalUnreadMessagesPosts = await new Parse.Query('Post')
    .equalTo('type', GENERAL_UNREADMESSAGES_POST_TYPE)
    .equalTo('attributes.channelSid', channelsid)
    .first();
  // Decrement by 1 the unreadMessages counter
  if (generalUnreadMessagesPosts.length) {
    generalUnreadMessagesPosts.forEach(gurmp => {
      if (type === INCREASE_UNREAD_MESSAGES) {
        db.getValueForNextSequence(`unreadMessages_${gurmp.id}`)
          .then(numberOfUnread => {
            gurmp.set('attributes.numberOfUnread', numberOfUnread);
            gurmp.save(null, { useMasterKey: true });
          })
          .catch(error => {
            throw new FeedServiceError(error.message);
          });
      }
      // TODO: Decrease (needs implementation)
      if (type === DECREASE_UNREAD_MESSAGES) {
        db.getPreviousValueForSequence(`unreadMessages_${gurmp.id}`)
          .then(numberOfUnread => {
            if (numberOfUnread) {
              gurmp.set('attributes.numberOfUnread', numberOfUnread);
              gurmp.save(null, { useMasterKey: true });
            }
          })
          .catch(error => {
            throw new FeedServiceError(error.message);
          });
      }
    });
  }
};

export default {
  createPost,
  createFeedForUser,
  createUnreadMessagesPost,
  createGeneralUnreadMessagesPost,
  updatePostUnreadMessages,
  updateGeneralPostUnreadMessage,
};
