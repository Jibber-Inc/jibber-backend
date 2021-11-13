import Parse from '../../providers/ParseProvider';
import message from './message';
import reaction from './reaction';
import member from './member';
import channel from './channel';
import user from './user';

/**
 * Post-Event Webhooks fire after any action taken on a Chat Service.
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const chatAfterEvent = async (request, response) => {
  const { type } = request.body;
  const [currentHandler, eventType] = type && type.split('.');

  if (!currentHandler || !eventType) {
    return response.status(500).json({ error: 'Webhook type is missing.' });
  }

  const handlers = {
    message,
    reaction,
    member,
    channel,
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
