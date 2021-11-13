import Parse from '../../providers/ParseProvider';

/**
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const chatBeforeEvent = async (request, response) => {
  const { type } = request.body;
  console.log(request, response);

  // Log Stream event in Parse
  const eventLog = new Parse.Object('EventLog');
  eventLog.set('provider', 'Stream');
  eventLog.set('eventType', type);
  eventLog.set('payload', request.body);
  await eventLog.save(null, { useMasterKey: true });
};

export default chatBeforeEvent;
