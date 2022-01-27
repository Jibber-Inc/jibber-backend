import Parse from '../../providers/ParseProvider';
import message from './message';

/**
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const chatBeforeEvent = async (request, response) => {
  console.log('***************AAAAAAAAA*******************')
  console.log(request.body)
  const { type } = request.body;
  console.log(type)
  const [currentHandler, eventType] = type && type.split('.');
  console.log('***************xxxxxxxxxxxxxx*******************')
  console.log(currentHandler,'----', eventType)

  if (!currentHandler || !eventType) {
    return response.status(500).json({ error: 'Webhook type is missing.' });
  }

  const handlers = {
    message,
  };

  console.log('************************************')
  console.log('************CHAT BEFORE EVENT ******************')

  const eventLog = new Parse.Object('EventLog');

  console.log('************************************')
  console.log('************ EVENT LOG TYPE ******************')
  console.log(type)

  console.log('************************************')
  console.log('************ BODY  ******************')
  console.log(request.body)

  try {
    
    // Log Stream event in Parse
    eventLog.set('provider', 'Stream');
    eventLog.set('eventType', type);
    eventLog.set('payload', request.body);

    // await eventLog.save(null, { useMasterKey: true });
    console.log('************************************')
    console.log(handlers)
    console.log('************ HANDLERS  ******************')
    console.log(currentHandler)
    console.log(eventType)
    return handlers[currentHandler][eventType](request, response);
  } catch (error) {
    const msg = `No handler found for ${type}`;
    eventLog.set('error', msg);
    await eventLog.save(null, { useMasterKey: true });
    return response.status(500).json({ error: msg });
  }
};

export default chatBeforeEvent;
