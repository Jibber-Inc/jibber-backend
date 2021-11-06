import Parse from '../providers/ParseProvider';

// Cloud functions
import sendCode from './sendCode';
import sendPush from './sendPush';
import validateCode from './validateCode';
import createHandle from './createHandle';
import getChatToken from './getChatToken';
import getConnections from './getConnections';
import updateConnection from './updateConnection';
import createChannel from './createChannel';
import setActiveStatus from './setActiveStatus';
import updateReservation from './updateReservation';
import createConnection from './createConnection';


// Webhooks
import connectionAfterSave from './webhooks/connectionAfterSave';
import userBeforeSave from './webhooks/userBeforeSave';
import userAfterSave from './webhooks/userAfterSave';
import userAfterDelete from './webhooks/userAfterDelete';
import sendSMS from './sendSMS';
import sendMessage from './sendMessage';

// Load Environment variables
const { BENJI_SECRET_PASSWORD_TOKEN } = process.env;

// Don't allow undefined or empty variable for secret password token
if (!BENJI_SECRET_PASSWORD_TOKEN) {
  throw new Error('BENJI_SECRET_PASSWORD_TOKEN must be set');
}

// Cloud code functions
// Signup workflow
Parse.Cloud.define('sendCode', sendCode);
Parse.Cloud.define('validateCode', validateCode);
Parse.Cloud.define('setActiveStatus', setActiveStatus);

// Others
Parse.Cloud.define('sendPush', sendPush);
Parse.Cloud.define('createHandle', createHandle);
Parse.Cloud.define('getChatToken', getChatToken);
Parse.Cloud.define('getConnections', getConnections);
Parse.Cloud.define('updateConnection', updateConnection);
Parse.Cloud.define('createChannel', createChannel);
Parse.Cloud.define('updateReservation', updateReservation);
Parse.Cloud.define('createConnection', createConnection);
Parse.Cloud.define('sendSMS', sendSMS);
Parse.Cloud.define('sendMessage', sendMessage);

// --- Cloud code webhooks ----------------------------------------------------
// Connection webhooks
Parse.Cloud.afterSave('Connection', connectionAfterSave);

// User webhooks
Parse.Cloud.beforeSave(Parse.User, userBeforeSave);
Parse.Cloud.afterSave(Parse.User, userAfterSave);
Parse.Cloud.afterDelete(Parse.User, userAfterDelete);
