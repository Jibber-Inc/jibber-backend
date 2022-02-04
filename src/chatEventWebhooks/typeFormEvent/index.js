/**
 * Post-Event Webhooks fire after any action taken on a Chat Service.
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const typeFormEvent = async (request, response) => {
  console.log('********** ENTRO ***********');

  console.log(request.body);
  console.log('--------------------');

  const { form_request } = request.body;
  const { formRequest } = request.body;

  console.log('***** XXXXXXXX *****');
  console.log(form_request, formRequest);
};

export default typeFormEvent;
