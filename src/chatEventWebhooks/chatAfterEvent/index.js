import Parse from '../../providers/ParseProvider';

/**
 * Post-Event Webhooks fire after any action taken on a Chat Service.
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const chatAfterEvent = async (request, response) => {
  const { type } = request.body;
  console.log(request, response);

  // Log Stream event in Parse
  const eventLog = new Parse.Object('EventLog');
  eventLog.set('provider', 'Stream');
  eventLog.set('eventType', type);
  eventLog.set('payload', request.body);
  await eventLog.save(null, { useMasterKey: true });

  // // Return error if no route for EventType
  // if (!Object.prototype.hasOwnProperty.call(handlers, EventType)) {
  //   const msg = `No handler found for ${EventType}`;
  //   // Log twilio event error in Parse
  //   eventLog.set('error', msg);
  //   await eventLog.save(null, { useMasterKey: true });
  //   return response.status(403).send(msg);
  // }

  // return handlers[EventType](request, response);
};

export default chatAfterEvent;
