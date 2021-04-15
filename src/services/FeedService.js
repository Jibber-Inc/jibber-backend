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
      .equalTo('owner', user)
      .first({ useMasterKey: true });
    if (!feed) {
      feed = new Parse.Object('Feed');
      feed.setACL(new Parse.ACL(user));
      feed.set('owner', user);
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
      .equalTo('owner', user)
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
 * Deletes the feed and posts for the given user
 */
const deleteFeedAndPosts = async user => {
  try {
    const query = new Parse.Query('Feed');
    query.equalTo('owner', user);
    const feed = await query.first({ useMasterKey: true });
    const posts = await feed.relation('posts').query().find();
    await Parse.Object.destroyAll(posts);
    await feed.destroy({ useMasterKey: true });
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
    priority = 1,
    body,
    expirationDate = null,
    triggerDate = null,
    duration = 5,
    author,
    attributes = {},
    file,
  } = data;
  try {
    const mediaFile = new Parse.File('post_photo.jpg', file);
    const post = new Parse.Object('Post');
    post.set('type', type);
    post.set('priority', priority);
    post.set('body', body);
    post.set('expirationDate', expirationDate);
    post.set('triggerDate', triggerDate);
    post.set('duration', duration);
    post.set('author', author);
    post.set('attributes', attributes);
    post.set('file', mediaFile);
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
 * Retrieves all the media posts for a given user
 * and all the media posts for their contacts (connections)
 *
 * @param {*} user
 * @returns
 */
const getFeeds = async user => {
  let contactsFeeds;

  // Get the user's Feed
  const userFeed = await new Parse.Query('Feed')
    .equalTo('owner', user)
    .first({ useMasterKey: true });

  // Query for connections to the user
  const toQuery = new Parse.Query('Connection')
    .equalTo('to', user)
    .equalTo('status', 'accepted');
  // Query for connections from the user
  const fromQuery = new Parse.Query('Connection')
    .equalTo('from', user)
    .equalTo('status', 'accepted');
  // Get all the connections of the user
  const userConnections = await Parse.Query.or(toQuery, fromQuery).find();
  // Take from the connections all the contacts of the user
  const userContacts = userConnections.map(con =>
    con.get('from').id === user.id ? con.get('to') : con.get('from'),
  );

  // For each contact, retrieve the media posts
  if (userContacts.length) {
    const contactsMediaPosts = await Promise.all(
      userContacts.map(async contact =>
        new Parse.Query('Post')
          .equalTo('type', 'media')
          .equalTo('author', contact)
          .greaterThan('expirationDate', new Date())
          .find({ useMasterKey: true }),
      ),
    );

    // Filter the user that has media posts
    const contactsWithMediaPosts = contactsMediaPosts
      .filter(posts => posts.length)
      .map(posts => posts[0].get('author'));

    // Get the Feed object for every user with media posts
    [contactsFeeds] = await Promise.all(
      contactsWithMediaPosts.map(contact =>
        new Parse.Query('Feed')
          .equalTo('owner', contact)
          .find({ useMasterKey: true }),
      ),
    );
  }
  // Merge all the Feeds in one array
  let mediaFeeds = [userFeed];
  if (contactsFeeds) {
    mediaFeeds = [...mediaFeeds, ...contactsFeeds];
  }

  return mediaFeeds;
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
        priority: 0,
        body: `You have (0) unread message/s.`,
        expirationDate: null,
        triggerDate: null,
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
const increasePostUnreadMessages = async (fromUser, channelsid) => {
  // Get all unreadMessages posts for the channel
  const unreadMessagesPosts = await new Parse.Query('Post')
    .equalTo('type', UNREADMESSAGES_POST_TYPE)
    .equalTo('attributes.channelSid', channelsid)
    .notEqualTo('author', fromUser)
    .find({ userMasterKey: true });

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
const increaseGeneralPostUnreadMessages = async users => {
  users.forEach(user => {
    new Parse.Query('Post')
      .equalTo('type', GENERAL_UNREADMESSAGES_POST_TYPE)
      .equalTo('author', user)
      .first({ userMasterKey: true })
      .then(post => {
        db.getValueForNextSequence(`generalUnreadMessages_${post.id}`).then(
          numberOfUnread => {
            post.set('attributes.numberOfUnread', numberOfUnread);
            post.save(null, { useMasterKey: true });
          },
        );
      })
      .catch(error => {
        throw new FeedServiceError(error.message);
      });
  });
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
    .first({ useMasterKey: true });

  // Decrease by 1 the unreadMessages counter
  if (urmp) {
    db.getPreviousValueForSequence(`unreadMessages_${urmp.id}`)
      .then(numberOfUnread => {
        urmp.set('attributes.numberOfUnread', numberOfUnread);
        urmp.save(null, { useMasterKey: true });
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
const decreaseGeneralPostUnreadMessages = async reader => {
  // Get the generalUnreadMessages posts for the channel
  const post = await new Parse.Query('Post')
    .equalTo('type', GENERAL_UNREADMESSAGES_POST_TYPE)
    .equalTo('author', reader)
    .first({ useMasterKey: true });

  db.getPreviousValueForSequence(`generalUnreadMessages_${post.id}`)
    .then(numberOfUnread => {
      post.set('attributes.numberOfUnread', numberOfUnread);
      post.save(null, { useMasterKey: true });
    })
    .catch(error => {
      throw new FeedServiceError(error.message);
    });
};

const createComment = async data => {
  const { author, post, body, attributes, reply, updateId } = data;

  let replyComment;

  if (reply) {
    replyComment = await new Parse.Query('Comment').get(reply, {
      useMasterKey: true,
    });
  }

  const comment = new Parse.Object('Comment');
  const relatedPost = await new Parse.Query('Post').get(post);

  comment.set('author', author);
  comment.set('body', body);
  comment.set('attributes', attributes);
  comment.set('reply', replyComment);
  comment.set('post', relatedPost);
  comment.set('updateId', updateId);
  await comment.save(null, { useMasterKey: true });

  const relation = relatedPost.relation('comments');
  relation.add(comment);
  await relatedPost.save(null, { useMasterKey: true });

  return comment;
};

export default {
  createPost,
  getUserFeed,
  deleteFeedAndPosts,
  createFeedForUser,
  createUnreadMessagesPost,
  createGeneralUnreadMessagesPost,
  increasePostUnreadMessages,
  increaseGeneralPostUnreadMessages,
  decreasePostUnreadMessages,
  decreaseGeneralPostUnreadMessages,
  createComment,
  getFeeds,
};
