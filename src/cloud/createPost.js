import ExtendableError from 'extendable-error-class';
import FeedService from '../services/FeedService';

class CreatePostError extends ExtendableError {}

const createPost = async request => {
  const { user } = request;
  const {
    type,
    priority,
    body,
    expirationDate,
    triggerDate,
    duration,
    author = user,
    attributes,
    file,
  } = request.params;

  try {
    const postData = {
      type,
      priority,
      body,
      expirationDate,
      triggerDate,
      duration,
      author,
      attributes,
      file,
    };

    const post = await FeedService.createPost(postData);
    return post;
  } catch (error) {
    throw new CreatePostError(error.message);
  }
};

export default createPost;
