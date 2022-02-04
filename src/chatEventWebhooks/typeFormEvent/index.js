/**
 * Post-Event Webhooks fire after any action taken on a Chat Service.
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const typeFormEvent = async (request, response) => {
  console.log('***** ENTRO *****');

  console.log(response.body);
  console.log('--------------------');

  const { body } = response;

  console.log('***** xxxxxxx *****');
  console.log(body);
};

export default typeFormEvent;
