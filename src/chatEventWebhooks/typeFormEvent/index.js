import MessaginService from '../../services/MessagingService';

/**
 * Post-Event Webhooks fire after any action taken on a Chat Service.
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const typeFormEvent = async (request, response) => {
  const { form_response, event_type } = request.body;
  console.log('*****************************')

  console.log('RESPONSE TYPE FORM EVENT ')
  if (form_response && event_type && form_response.answers && event_type === 'form_response') {
    const { answers } = form_response;
    console.log('*****************************')
    console.log('ENTROO')
    
    if (answers) {
      const phoneNumber = answers[2].phone_number;
      const name = answers[0].text;
      const message = `${name} tap the link below to get access to the Jibber private alpha. https://testflight.apple.com/join/YnJTwvSL`;
    
      // await MessaginService.createMessage(phoneNumber, message);
    }
  }
};

export default typeFormEvent;
