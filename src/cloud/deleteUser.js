// Providers
import Parse from '../providers/ParseProvider';
import Stream from '../providers/StreamProvider';
// Services
import ChatService from '../services/ChatService';
import UserService from '../services/UserService';

/**
 * Send a Chat message
 * @param {Object} request
 */
const deleteUser = async request => {
  const { params } = request;
  const { userId } = params;

  if (!userId) throw new Error('A userId is required');

  try {
    const user = await new Parse.Query(Parse.User).get(userId);

    if (!user) throw new Error('User not found in Parse');

    const deletedUser =  ChatService.deleteUser(user.id);

    return deletedUser;
  } catch (error) {
    throw error.message;
  }
};

export default deleteUser;
