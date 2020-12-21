import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import createChatTokenService from '../services/createChatTokenService';

class GetChatCredentialsError extends ExtendableError {}

const getChatToken = (request) => {
  const { user } = request;

  if (!(user instanceof Parse.User)) {
    throw new GetChatCredentialsError('[q3TZJ1y2] request.user is invalid.');
  }

  return createChatTokenService(user.id);
};

export default getChatToken;
