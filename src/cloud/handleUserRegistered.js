
import createChatChannelService from '../../services/createChatChannelService';

const handleUserRegistered = request => {

  const user = request.user;

  // create channels
  Promise.all([
    createChatChannelService(user, `Welcome_${user.id}`, 'Welcome!'),
  ]);
};




 export default handleUserRegistered;