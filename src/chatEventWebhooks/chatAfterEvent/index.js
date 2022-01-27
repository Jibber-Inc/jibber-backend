import Parse from '../../providers/ParseProvider';
import message from './message';
import reaction from './reaction';
import member from './member';
import conversation from './conversation';
import user from './user';
import EventWrapper from '../../utils/eventWrapper';

/**
 * Post-Event Webhooks fire after any action taken on a Chat Service.
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const chatAfterEvent = async (request, response) => {
  console.log('BBBBBBBBBBBBBBBBBBBBBB')
  console.log(request.body)
  const { type } = request.body;
  console.log(type)
  const [currentHandler, eventType] = EventWrapper.getEventInfo(type);

  if (!currentHandler || !eventType) {
    return response
      .status(500)
      .json({ error: `Webhook type is missing.Type: ${type}` });
  }

  const handlers = {
    message,
    reaction,
    member,
    conversation,
    user,
  };

  const eventLog = new Parse.Object('EventLog');

  try {
    // Log Stream event in Parse
    eventLog.set('provider', 'Stream');
    eventLog.set('eventType', type);
    eventLog.set('payload', request.body);

    await eventLog.save(null, { useMasterKey: true });

    return handlers[currentHandler][eventType](request, response);
  } catch (error) {
    const msg = `No handler found for ${type}`;
    eventLog.set('error', msg);
    await eventLog.save(null, { useMasterKey: true });
    return response.status(500).json({ error: msg });
  }
};

export default chatAfterEvent;
