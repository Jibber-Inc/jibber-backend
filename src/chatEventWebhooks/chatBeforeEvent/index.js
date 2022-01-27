/**
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const chatBeforeEvent = async (request, response) => {
  /*
  
  TYPE IS UNDEFINED BUT WE DON'T HAVE 
  IMPLEMENTED THE MESSAGES HOOKS FOR CHAT BEFORE EVENT

  */
  // const { type } = request.body; //
 
  // const [currentHandler, eventType] = type && type.split('.');
 
  /* if (!currentHandler || !eventType) {
    return response.status(500).json({ error: 'Webhook type is missing.' });
  } */

  /* const handlers = {
    message,
  }; */

  // const eventLog = new Parse.Object('EventLog');
  // try {
    // await eventLog.save(null, { useMasterKey: true });

  // return handlers[currentHandler][eventType](request, response);
  // } catch (error) {
  /*  const msg = `No handler found for ${type}`;
      eventLog.set('error', msg);
      await eventLog.save(null, { useMasterKey: true });
      return response.status(500).json({ error: msg }); */
   // }
};

export default chatBeforeEvent;
