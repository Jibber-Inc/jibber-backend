import Parse from '../providers/ParseProvider';

// Cloud functions
import sendCode from './sendCode';
import sendPush from './sendPush';
import validateCode from './validateCode';
import createConnection from './createConnection';
import verifyReservation from './verifyReservation';
import createHandle from './createHandle';
import getChatToken from './getChatToken';
import getConnections from './getConnections';
import updateConnection from './updateConnection';
import handleUserRegistered from './handleUserRegistered';

// Webhooks
import connectionAfterSave from './webhooks/connectionAfterSave';
import userBeforeSave from './webhooks/userBeforeSave';
import userAfterSave from './webhooks/userAfterSave';
import reservationBeforeSave from './webhooks/reservationBeforeSave';

// Load Environment variables
const { BENJI_SECRET_PASSWORD_TOKEN } = process.env;

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

// Cloud code functions
Parse.Cloud.define('sendCode', sendCode);
Parse.Cloud.define('sendPush', sendPush);
Parse.Cloud.define('validateCode', validateCode);
Parse.Cloud.define('createConnection', createConnection);
Parse.Cloud.define('verifyReservation', verifyReservation);
Parse.Cloud.define('createHandle', createHandle);
Parse.Cloud.define('getChatToken', getChatToken);
Parse.Cloud.define('getConnections', getConnections);
Parse.Cloud.define('updateConnection', updateConnection);
Parse.Cloud.define('handleUserRegistered', handleUserRegistered);

// --- Cloud code webhooks ----------------------------------------------------
// Connection webhooks
Parse.Cloud.afterSave('Connection', connectionAfterSave);

// User webhooks
Parse.Cloud.beforeSave(Parse.User, userBeforeSave);
Parse.Cloud.afterSave(Parse.User, userAfterSave);

// Reservation webhooks
Parse.Cloud.beforeSave('Reservation', reservationBeforeSave);
