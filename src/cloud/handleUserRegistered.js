import Parse from '../providers/ParseProvider';
import ExtendableError from 'extendable-error-class';

import createChatChannelService from '../../services/createChatChannelService';

class HandleUserRegisteredError extends ExtendableError {}

const handleUserRegistered = request => {

  const user = request.user;

  if (!Boolean(user instanceof Parse.User)) {
    throw new HandleUserRegisteredError(
      '[q3TZJ1y2] request.user is invalid.'
    );
  }

  // create channels
  Promise.all([
    createChatChannelService(user, `Welcome_${user.id}`, 'Welcome!'),
  ]);
};




 export default handleUserRegistered;