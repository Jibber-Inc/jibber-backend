import ExtendableError from 'extendable-error-class';
import FeedService from '../services/FeedService';

class CreateCommentError extends ExtendableError {}

const createConnection = async request => {
  const commentData = request.params;

  try {
    if (!commentData.post) {
      throw new CreateCommentError('Post not found when creating the comment.');
    }
    if (!commentData.body) {
      throw new CreateCommentError('Trying to create an empty comment.');
    }

    const comment = await FeedService.createComment(commentData);
    return comment;
  } catch (error) {
    throw new CreateCommentError(error.message);
  }
};

export default createConnection;
