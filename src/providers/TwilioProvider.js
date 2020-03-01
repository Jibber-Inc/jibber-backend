// Vendor modules
const twilio = require('twilio');



class Twilio {
  constructor() {

    // Load environment variables
    const {
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
    } = process.env;

    // Throw if required env vars are not declared before trying to build instance
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('[2xYv/ijM] TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables are required');
    }

    // set this.client to twilio client with given info
    this.client = new twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
}


export default Twilio;
