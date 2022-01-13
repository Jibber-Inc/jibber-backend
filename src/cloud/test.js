// Vendor modules
import ExtendableError from 'extendable-error-class';
// Providers
// import Parse from '../providers/ParseProvider';
// import EventWrapper from '../utils/eventWrapper';
// import ChatService from '../services/ChatService';

class TestError extends ExtendableError { }

const test = async request => {

  // Test if the wrapper for channels is working
  try {

    // Test the EventWrapper
    // const { params } = request;
    // const { type } = params;
    // const [currentHandler, eventType] = EventWrapper.getEventInfo(type);
    // return [currentHandler, eventType];

    // Test add member to conversation
    // const { conversationCid, memberId } = request.params;
    // const conversation = await ChatService.getConversationByCid(conversationCid);
    // const result = await ChatService.addMemberToConversation(conversation, [memberId]);
    // return result;

    return request.params;

  } catch (error) {
    throw new TestError(`Error: ${error}`);
  }
};

export default test;
