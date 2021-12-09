// Vendor modules
import ExtendableError from 'extendable-error-class';
// Providers
// import Parse from '../providers/ParseProvider';
import EventWrapper from '../utils/eventWrapper';

class TestError extends ExtendableError {}

const test = async request => {
  const { params } = request;

  // Test if the wrapper for channels is working
  try {
    const { type } = params;
    const [currentHandler, eventType] = EventWrapper.getEventInfo(type);
    return [currentHandler, eventType];
  } catch (error) {
    throw new TestError(`Error: ${error}`);
  }
};

export default test;
