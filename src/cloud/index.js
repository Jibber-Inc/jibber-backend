import Parse from '../providers/ParseProvider';

// Cloud functions
import sendCode from './sendCode';
import sendPush from './sendPush';
import validateCode from './validateCode';
import createHandle from './createHandle';
import getChatToken from './getChatToken';
import getConnections from './getConnections';
import updateConnection from './updateConnection';
import createConversation from './createConversation';
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
const { JIBBER_SECRET_PASSWORD_TOKEN } = process.env;

// Don't allow undefined or empty variable for secret password token
if (!JIBBER_SECRET_PASSWORD_TOKEN) {
  throw new Error('JIBBER_SECRET_PASSWORD_TOKEN must be set');
}

// Endpoints
// Signup
Parse.Cloud.define('sendCode', sendCode);
Parse.Cloud.define('validateCode', validateCode);
Parse.Cloud.define('setActiveStatus', setActiveStatus);

// Chat
Parse.Cloud.define('getChatToken', getChatToken);
Parse.Cloud.define('sendMessage', sendMessage);
Parse.Cloud.define('createConversation', createConversation);

// Connection
Parse.Cloud.define('getConnections', getConnections);
Parse.Cloud.define('createConnection', createConnection);

// Reservation
Parse.Cloud.define('updateConnection', updateConnection);
Parse.Cloud.define('updateReservation', updateReservation);

// Others
Parse.Cloud.define('sendPush', sendPush);
Parse.Cloud.define('createHandle', createHandle);
Parse.Cloud.define('sendSMS', sendSMS);

// --- Cloud code webhooks ----------------------------------------------------
// Connection webhooks
Parse.Cloud.afterSave('Connection', connectionAfterSave);

// User webhooks
Parse.Cloud.beforeSave(Parse.User, userBeforeSave);
Parse.Cloud.afterSave(Parse.User, userAfterSave);
Parse.Cloud.afterDelete(Parse.User, userAfterDelete);
