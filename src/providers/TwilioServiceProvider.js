// Vendor modules
const twilio = require('twilio');


const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
} = process.env;

// Throw if required env vars are not declared before trying to build instance
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  throw new Error('[2xYv/ijM] TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables are required');
}


const Twilio = new twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);


export default Twilio;
