import ExtendableError from 'extendable-error-class';
import FeedService from '../services/FeedService';

class CreateCommentError extends ExtendableError {}

const createComment = async request => {
  const { post, body, attributes = {}, reply = undefined } = request.params;

  try {
    if (!post) {
      throw new CreateCommentError('Post not found when creating the comment.');
    }
    if (!body) {
      throw new CreateCommentError('Trying to create an empty comment.');
    }

    const commentData = {
      post,
      body,
      attributes,
      reply,
    };

    const comment = await FeedService.createComment(commentData);
    return comment;
  } catch (error) {
    throw new CreateCommentError(error.message);
  }
};

export default createComment;
