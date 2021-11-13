import Parse from '../../providers/ParseProvider';

const newMessage = async (request, response) => {
  const { type } = request.body;
  console.log('RESPONSE', response);

  // Log Stream event in Parse
  const eventLog = new Parse.Object('EventLog');
  eventLog.set('provider', 'Stream');
  eventLog.set('eventType', `New Message - ${type}`);
  eventLog.set('payload', request.body);
  await eventLog.save(null, { useMasterKey: true });
};

export default {
  new: newMessage,
};
