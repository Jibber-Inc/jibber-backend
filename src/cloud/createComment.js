import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import FeedService from '../services/FeedService';

class CreateCommentError extends ExtendableError {}

const createComment = async request => {
  const { user } = request;
  const {
    post,
    body,
    attributes = {},
    reply = undefined,
    updateId,
  } = request.params;

  try {
    if (!(user instanceof Parse.User)) {
      throw new CreateCommentError('User not found.');
    }
    if (!post) {
      throw new CreateCommentError('Post not found when creating the comment.');
    }
    if (!body) {
      throw new CreateCommentError('Trying to create an empty comment.');
    }

    const commentData = {
      author: user,
      post,
      body,
      attributes,
      reply,
      updateId,
    };

    const comment = await FeedService.createComment(commentData);
    return comment;
  } catch (error) {
    throw new CreateCommentError(error.message);
  }
};

export default createComment;
