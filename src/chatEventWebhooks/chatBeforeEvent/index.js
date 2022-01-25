import Parse from '../../providers/ParseProvider';
import message from './message';

/**
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const chatBeforeEvent = async (request, response) => {
  console.info('************************')
    console.info('**********BEFORE EVENT**************')
  const { type } = request.body;
  const [currentHandler, eventType] = type && type.split('.');

  if (!currentHandler || !eventType) {
    return response.status(500).json({ error: 'Webhook type is missing.' });
  }

  const handlers = {
    message,
  };

  const eventLog = new Parse.Object('EventLog');
  console.info('************************')
    console.info('**********EVENT LOG**************')
  try {
    
    // Log Stream event in Parse
    eventLog.set('provider', 'Stream');
    eventLog.set('eventType', type);
    eventLog.set('payload', request.body);
    console.info('************************')
    console.info('**********EVENTLOG SAVE**************')
    await eventLog.save(null, { useMasterKey: true });
    console.info('************************')
    console.info('**********ASD**************')
    return handlers[currentHandler][eventType](request, response);
  } catch (error) {
    const msg = `No handler found for ${type}`;
    eventLog.set('error', msg);
    await eventLog.save(null, { useMasterKey: true });
    return response.status(500).json({ error: msg });
  }
};

export default chatBeforeEvent;
