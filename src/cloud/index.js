// Cloud functions
import sendCode from './sendCode';
import sendPush from './sendPush';
import validateCode from './validateCode';
import updateConnection from './updateConnection';
import createConnection from './createConnection';
import verifyReservation from './verifyReservation';


// Load Environment variables
const {
  BENJI_SECRET_PASSWORD_TOKEN,
} = process.env;


// Don't allow undefined or empty variable for secret password token
if (!BENJI_SECRET_PASSWORD_TOKEN) {
  throw new Error('BENJI_SECRET_PASSWORD_TOKEN must be set');
}

/**
 * Test function
 */
Parse.Cloud.define('hello', () => {
  return 'Hi';
});


Parse.Cloud.define('sendCode', sendCode);
Parse.Cloud.define('sendPush', sendPush);
Parse.Cloud.define('validateCode', validateCode);
Parse.Cloud.define('updateConnection', updateConnection);
Parse.Cloud.define('createConnection', createConnection);
Parse.Cloud.define('verifyReservation', verifyReservation);
