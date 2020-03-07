import Parse from '../providers/ParseProvider';
import ExtendableError from 'extendable-error-class';
import createChatToken from '../utils/createChatToken';


class GetChatCredentialsError extends ExtendableError {}



const getChatToken = request => {

  const user = request.user;

  if (!Boolean(user instanceof Parse.User)) {
    throw new GetChatCredentialsError(
      '[q3TZJ1y2] request.user is invalid.'
    );
  }

  return createChatToken(user.id);
};




export default getChatToken;