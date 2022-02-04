

/**
 * Post-Event Webhooks fire after any action taken on a Chat Service.
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const typeFormEvent = async (request, response) => {
  console.log('*****************************************')
  console.log('*************** TYPE FORM EVENT *******************')
  console.log( request.body);

};

export default typeFormEvent;
