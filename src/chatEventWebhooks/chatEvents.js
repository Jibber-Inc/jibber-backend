import Parse from '../providers/ParseProvider';

const chatEvents = async (request, response) => {
  console.log('*******************************************')
  console.log('*******************************************')
  console.log('Request', request)
  console.log('Response', response)
  console.log('*******************************************')
  console.log('*******************************************')
  const eventLog = new Parse.Object('EventLog');
  eventLog.set('provider', 'stream');
  eventLog.set('eventType', 'test');
  eventLog.set('payload', request.body);
  await eventLog.save(null, { useMasterKey: true });
  return false;
};

export default chatEvents