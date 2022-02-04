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

  const { form_response } = request.body;

  console.log('***** XXXXXXXX *****');
  console.log(form_response);

  if(form_response && form_response.answers){
    const { answers } = form_response;

    console.log('GGGG',answers[0])
  }
};

export default typeFormEvent;
