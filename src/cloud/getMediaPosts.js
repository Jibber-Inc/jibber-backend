import ExtendableError from 'extendable-error-class';
import FeedService from '../services/FeedService';

class GetMediaPostsError extends ExtendableError {}

const getMediaPosts = async request => {
  const { user } = request;

  try {
    const mediaPosts = await FeedService.getMediaPosts(user);
    return mediaPosts;
  } catch (error) {
    throw new GetMediaPostsError(error.message);
  }
};

export default getMediaPosts;
