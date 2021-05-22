// Vendor
import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
// Constants
import { UNREADMESSAGES_POST_TYPE } from '../constants';
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
    file = null,
    preview = null,
  } = data;
  try {
    let mediaFile;
    let mediaPreview;
    const post = new Parse.Object('Post');
    post.set('type', type);
    post.set('priority', priority);
    post.set('body', body);
    post.set('expirationDate', expirationDate);
    post.set('triggerDate', triggerDate);
    post.set('duration', duration);
    post.set('author', author);
    post.set('attributes', attributes);
    if (file) {
      mediaFile = new Parse.File('post_photo.jpg', file);
      post.set('file', mediaFile);
    }
    if (preview) {
      mediaPreview = new Parse.File('preview_photo.jpg', preview);
      post.set('preview', mediaPreview);
    }
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
 * Creates a post to be user for the general unread messages info
 *
 * @param {*} user
 */
const createUnreadMessagesPost = async user => {
  try {
    // Check if the post already exists
    let unreadMessagesPost = await new Parse.Query('Post')
      .equalTo('type', UNREADMESSAGES_POST_TYPE)
      .equalTo('author', user)
      .first();
    // If no general post, create one
    if (!unreadMessagesPost) {
      // Create the post structure
      const postData = {
        type: UNREADMESSAGES_POST_TYPE,
        priority: 1,
        body: `Unread messages post`,
        expirationDate: null,
        triggerDate: null,
        author: user,
        attributes: { unreads: [] },
      };
      unreadMessagesPost = await createPost(postData);
    }
    return unreadMessagesPost;
  } catch (error) {
    throw new FeedServiceError(error.message);
  }
};

/**
 * Updates the given unreadMessages post with the given data
 *
 * @param {*} post
 * @param {*} channelSid
 * @param {*} numberOfUnreads
 * @param {*} user
 */
const updateUnreadMessagesPost = (post, channelSid, numberOfUnreads, user) => {
  const { unreads } = post.get('attributes');
  let updatedUnreads;
  const unreadExists = unreads.find(unread => unread.channelSid === channelSid);
  if (unreadExists) {
    updatedUnreads = unreads.map(unread => {
      const updatedUnread = { ...unread };
      if (updatedUnread.channelSid === channelSid) {
        updatedUnread.numberOfUnreads = numberOfUnreads;
      }
      return updatedUnread;
    });
  } else {
    updatedUnreads = [...unreads];
    const newUnread = {
      channelSid,
      numberOfUnreads,
      relatedTo: user,
    };
    updatedUnreads.push(newUnread);
  }
  post.set('attributes.unreads', updatedUnreads);
  post.save(null, { useMasterKey: true });
};

/**
 * Retrieves all the post with type = UNREADMESSAGES_POST_TYPE
 * and increases the unreadMessages attribute
 *
 * @param {*} channelsid
 */
const increasePostUnreadMessages = async (fromUser, channelSid) => {
  // Get all unreadMessages posts for the channel
  const unreadMessagesPosts = await new Parse.Query('Post')
    .equalTo('type', UNREADMESSAGES_POST_TYPE)
    .equalTo('attributes.unreads.channelSid', channelSid)
    .notEqualTo('author', fromUser)
    .find({ userMasterKey: true });

  // Increase by 1 the unreadMessages counter
  if (unreadMessagesPosts.length) {
    unreadMessagesPosts.forEach(urmp => {
      db.getValueForNextSequence(`unread_${urmp.id}_${channelSid}`)
        .then(numberOfUnreads => {
          updateUnreadMessagesPost(urmp, channelSid, numberOfUnreads, fromUser);
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
const decreasePostUnreadMessages = async (reader, channelSid) => {
  // Get all unreadMessages posts for the channel
  const urmp = await new Parse.Query('Post')
    .equalTo('type', UNREADMESSAGES_POST_TYPE)
    .equalTo('attributes.unreads.channelSid', channelSid)
    .equalTo('author', reader)
    .first({ useMasterKey: true });

  // Decrease by 1 the unreadMessages counter
  if (urmp) {
    db.getPreviousValueForSequence(`unread_${urmp.id}_${channelSid}`)
      .then(numberOfUnreads => {
        updateUnreadMessagesPost(urmp, channelSid, numberOfUnreads, reader);
      })
      .catch(error => {
        throw new FeedServiceError(error.message);
      });
  } else {
    throw new FeedServiceError(
      `[CODE] Unread messages post not found for the channel ${channelSid}`,
    );
  }
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
  increasePostUnreadMessages,
  decreasePostUnreadMessages,
  createComment,
  getFeeds,
};
