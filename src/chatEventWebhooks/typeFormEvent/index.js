/**
 * Post-Event Webhooks fire after any action taken on a Chat Service.
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const typeFormEvent = async (request, response) => {
  console.log('***** ENTRO *****');

  const { form_response } = response.body;
  if (form_response) {
    console.log('***** ANSWERS *****');
    const { answers } = form_response;

    console.log(answers[0]);
  }
};

export default typeFormEvent;
