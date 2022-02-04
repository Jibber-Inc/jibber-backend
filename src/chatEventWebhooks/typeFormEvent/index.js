/**
 * Post-Event Webhooks fire after any action taken on a Chat Service.
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const typeFormEvent = async (request, response) => {
  console.log('********** ENTRO ***********');
  console.log('--------------------');

  const { form_request } = request.body;

  console.log('***** XXXXXXXX *****');
  console.log(form_request);
};

export default typeFormEvent;
