

/**
 * Post-Event Webhooks fire after any action taken on a Chat Service.
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const typeFormEvent = async (request, response) => {
  console.log('*****************************************')
  console.log('*************** BODY *******************')
  console.log( request.body);
  console.log('*****************************************')
  console.log('*************** ANSWERS *******************')
  console.log( request.body.form_response.answers);
};

export default typeFormEvent;
