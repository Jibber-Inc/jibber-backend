import ExtendableError from 'extendable-error-class';
import Twilio from '../providers/TwilioProvider';

export class MessagingServiceError extends ExtendableError {}

/**
 * Create an SMS message

 * @param {String} phoneNumber
 * @param {String} message
 * @returns {Promise} */
const createMessage = async (phoneNumber, message) => {
  if (!phoneNumber) {
    throw new MessagingServiceError('[SmQNWk96] phoneNumber is required');
  }

  if (!message || typeof message !== 'string') {
    throw new MessagingServiceError('[ITLA8RgD] message is required');
  }
 
  try {
    const messageResult = await new Twilio().client.messages.create({
      from: '+12012560616',
      to: phoneNumber,
      body: message,
    });
    const { sid, status, errorCode, errorMessage } = messageResult;
   
    return { sid, status, errorCode, errorMessage };
  } catch (error) {
    throw new MessagingServiceError(error.message);
  }
};

export default {
  createMessage,
};
