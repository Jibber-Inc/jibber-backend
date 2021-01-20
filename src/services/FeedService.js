// Providers
// Vendor
import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';

class FeedServiceError extends ExtendableError {}

const createFeedForUser = user => {
  try {
    const feed = new Parse.Object('Feed');
    feed.setACL(new Parse.ACL(user));
    feed.set('user', user);
    feed.save(null, { userMasterKey: true });
    return feed;
  } catch (error) {
    throw new FeedServiceError(error.message);
  }
};

export default {
  createFeedForUser,
};
