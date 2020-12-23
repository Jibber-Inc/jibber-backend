import MessagingService from '../services/MessagingService';

/**
 * Send an SMS message
 * @param {Object} request
 */
const sendMessage = async request => {
  const { params, master } = request;
  if (!master) throw new Error('You are not allowed to run this function');

  const { phoneNumber, message } = params;

  return MessagingService.createMessage(phoneNumber, message);
};

export default sendMessage;
