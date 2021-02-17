// Vendor
import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
// Constants
import {
  UNREADMESSAGES_POST_TYPE,
  GENERAL_UNREADMESSAGES_POST_TYPE,
} from '../constants';
// Utils
import db from '../utils/db';

class FeedServiceError extends ExtendableError {}

/**
 * Creates the feed object for the given user
 */
const createFeedForUser = async user => {
  try {
    let feed = await new Parse.Query('Feed')
      .equalTo('user', user)
      .first({ useMasterKey: true });
    if (!feed) {
      feed = new Parse.Object('Feed');
      feed.setACL(new Parse.ACL(user));
      feed.set('user', user);
      await feed.save(null, { userMasterKey: true });
    }
    return feed;
  } catch (error) {
    throw new FeedServiceError(error.message);
  }
};

const getUserFeed = async user => {
  try {
    const feed = await new Parse.Query('Feed')
      .equalTo('user', user)
      .first({ useMasterKey: true });
    if (!feed) {
      throw new FeedServiceError('Feed not found');
    }
    return feed;
  } catch (error) {
    throw new FeedServiceError(error.message);
  }
};

/**
 * Creates the feed object for the given user
 */
const deleteFeed = async user => {
  try {
    const query = new Parse.Query('Feed');
    query.equalTo('user', user);
    const feeds = await query.find({ useMasterKey: true });
    await Promise.all(feeds.map(feed => feed.destroy({ useMasterKey: true })));
  } catch (error) {
    throw new FeedServiceError(error.message);
  }
};

/**
 * Creates a post with the given data
 *
 * @param {*} data
 */
const createPost = async data => {
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
    await post.save(null, { useMasterKey: true });

    const feed = await getUserFeed(author);
    const relation = feed.relation('posts');
    relation.add(post);
    await feed.save(null, { useMasterKey: true });
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
      .equalTo('type', UNREADMESSAGES_POST_TYPE)
      .equalTo('attributes.channelSid', channel.sid)
      .equalTo('author', user)
      .first();
    if (!unreadMessagesPost) {
      // Create the post structure
      const postData = {
        type: UNREADMESSAGES_POST_TYPE,
        priority: 1,
        body: `You have (0) unread message/s in the conversation: (${channel.FriendlyName}).`,
        expirationDate: null,
        triggerDate: null,
        subject: UNREADMESSAGES_POST_TYPE,
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
        type: GENERAL_UNREADMESSAGES_POST_TYPE,
        priority: 1,
        body: `You have (0) unread message/s.`,
        expirationDate: null,
        triggerDate: null,
        subject: GENERAL_UNREADMESSAGES_POST_TYPE,
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
 * and increases the unreadMessages attribute
 *
 * @param {*} channelsid
 */
const increasePostUnreadMessages = async channelsid => {
  // Get all unreadMessages posts for the channel
  const unreadMessagesPosts = await new Parse.Query('Post')
    .equalTo('type', UNREADMESSAGES_POST_TYPE)
    .equalTo('attributes.channelSid', channelsid)
    .find();
  // Increase by 1 the unreadMessages counter
  if (unreadMessagesPosts.length) {
    unreadMessagesPosts.forEach(urmp => {
      db.getValueForNextSequence(`unreadMessages_${urmp.id}`)
        .then(numberOfUnread => {
          urmp.set('attributes.numberOfUnread', numberOfUnread);
          urmp.save(null, { useMasterKey: true });
        })
        .catch(error => {
          throw new FeedServiceError(error.message);
        });
    });
  }
};

/**
 * Retrieves all the post with type = GENERAL_UNREADMESSAGES_POST_TYPE
 * and increases the unreadMessages attribute
 *
 * @param {*} channelsid
 */
const increaseGeneralPostUnreadMessages = async channelsid => {
  // Get all the generalUnreadMessages post for the channel
  const generalUnreadMessagesPosts = await new Parse.Query('Post')
    .equalTo('type', GENERAL_UNREADMESSAGES_POST_TYPE)
    .equalTo('attributes.channelSid', channelsid)
    .find();
  // Increase by 1 the unreadMessages counter
  if (generalUnreadMessagesPosts.length) {
    generalUnreadMessagesPosts.forEach(gurmp => {
      db.getValueForNextSequence(`unreadMessages_${gurmp.id}`)
        .then(numberOfUnread => {
          gurmp.set('attributes.numberOfUnread', numberOfUnread);
          gurmp.save(null, { useMasterKey: true });
        })
        .catch(error => {
          throw new FeedServiceError(error.message);
        });
    });
  }
};

/**
 * Retrieves all the post with type = UNREADMESSAGES_POST_TYPE
 * and updates the unreadMessages attribute (increase or decrease)
 *
 * @param {*} reader
 * @param {*} channelsid
 */
const decreasePostUnreadMessages = async (reader, channelsid) => {
  // Get all unreadMessages posts for the channel
  const urmp = await new Parse.Query('Post')
    .equalTo('type', UNREADMESSAGES_POST_TYPE)
    .equalTo('attributes.channelSid', channelsid)
    .equalTo('author', reader)
    .first();
  // Decrease by 1 the unreadMessages counter
  if (urmp) {
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
  } else {
    throw new FeedServiceError(
      `[CODE] Unread messages post not found for the channel ${channelsid}`,
    );
  }
};

/**
 * Retrieves all the post with type = UNREADMESSAGES_POST_TYPE
 * and updates the unreadMessages attribute (increase or decrease)
 *
 * @param {*} reader
 * @param {*} channelsid
 */
const decreaseGeneralPostUnreadMessages = async (reader, channelsid) => {
  // Get all unreadMessages posts for the channel
  const gurmp = await new Parse.Query('Post')
    .equalTo('type', GENERAL_UNREADMESSAGES_POST_TYPE)
    .equalTo('attributes.channelSid', channelsid)
    .equalTo('author', reader)
    .first();
  // Decrease by 1 the unreadMessages counter
  if (gurmp) {
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
  } else {
    throw new FeedServiceError('[CODE] General unread messages post not found');
  }
};

export default {
  createPost,
  getUserFeed,
  deleteFeed,
  createFeedForUser,
  createUnreadMessagesPost,
  createGeneralUnreadMessagesPost,
  increasePostUnreadMessages,
  increaseGeneralPostUnreadMessages,
  decreasePostUnreadMessages,
  decreaseGeneralPostUnreadMessages,
};
