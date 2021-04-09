import ExtendableError from 'extendable-error-class';
import FeedService from '../services/FeedService';

class GetMediaPostsError extends ExtendableError {}

const getFeeds = async request => {
  const { user } = request;

  try {
    const mediaPosts = await FeedService.getFeeds(user);
    return mediaPosts;
  } catch (error) {
    throw new GetMediaPostsError(error.message);
  }
};

export default getFeeds;
