// Vendor modules
import ExtendableError from 'extendable-error-class';
// Providers
// import Parse from '../providers/ParseProvider';
// import EventWrapper from '../utils/eventWrapper';
import ReservationService from '../services/ReservationService';


class TestError extends ExtendableError { }

const test = async request => {
  const { user } = request;

  // Test if the wrapper for channels is working
  try {
    const result = await ReservationService.resetReservations(user);

    return result;


    // const { type } = params;
    // const [currentHandler, eventType] = EventWrapper.getEventInfo(type);
    // return [currentHandler, eventType];
  } catch (error) {
    throw new TestError(`Error: ${error}`);
  }
};

export default test;
