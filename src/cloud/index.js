import Parse from '../providers/ParseProvider';

// Cloud functions
import sendCode from './sendCode';
import sendPush from './sendPush';
import validateCode from './validateCode';
import createHandle from './createHandle';
import getConnections from './getConnections';
import updateConnection from './updateConnection';
import finalizeUserOnboarding from './finalizeUserOnboarding';
import updateReservation from './updateReservation';
import createConnection from './createConnection';
import createConversation from './createConversation';
import addReaction from './addReaction';
import {
  afterSaveMember,
  afterSaveMessage,
  afterSaveReceipt,
  beforeDeleteMessagingObject,
  beforeSaveConversation,
  beforeSaveMember,
  beforeSaveMessage,
  beforeSaveReaction,
  beforeSaveReceipt,
} from '../services/ParseMessagingService';
import MessagingMetricsService from '../services/MessagingMetricsService';
import { assertMinimumAppVersion } from '../utils/appVersion';
import {
  addParseMessageReaction,
  cleanupDeletedMessageAttachments,
  createParseConversation,
  getMessageByClientId,
  getMessagingCapabilities,
  markParseMessageRead,
  observeLiveQueryEvent,
  requireAuthenticatedLiveQuery,
  sendParseMessage,
  setParseConversationHidden,
} from './parseMessaging';
import {
  MESSAGING_CLASSES,
  MESSAGING_LIVE_QUERY_CLASSES,
} from '../constants/messaging';

// Test functions
import test from './test';

// Webhooks
import connectionAfterSave from './webhooks/connectionAfterSave';
import userBeforeSave from './webhooks/userBeforeSave';
import userAfterSave from './webhooks/userAfterSave';
import userAfterDelete from './webhooks/userAfterDelete';
import sendMessage from './sendMessage';

// Load Environment variables
const { JIBBER_SECRET_PASSWORD_TOKEN } = process.env;

const observeMessagingValidation = (className, operation, validator) =>
  async request => {
    try {
      if (!request.master && process.env.PARSE_MESSAGING_ENABLED === 'false') {
        throw new Error('Parse messaging is not enabled.');
      }
      assertMinimumAppVersion(request);
      return await validator(request);
    } catch (error) {
      MessagingMetricsService.error('write_rejected', error, {
        className,
        operation,
        userId: request.user && request.user.id,
      });
      throw error;
    }
  };

// Don't allow undefined or empty variable for secret password token
if (!JIBBER_SECRET_PASSWORD_TOKEN) {
  throw new Error('JIBBER_SECRET_PASSWORD_TOKEN must be set');
}

// Endpoints
// Signup
Parse.Cloud.define('sendCode', sendCode);
Parse.Cloud.define('validateCode', validateCode);
Parse.Cloud.define('finalizeUserOnboarding', finalizeUserOnboarding);

// Chat
Parse.Cloud.define('createConversation', createConversation);
Parse.Cloud.define('sendMessage', sendMessage);
Parse.Cloud.define('addReaction', addReaction);

// Parse-native messaging.
Parse.Cloud.define('messagingGetCapabilities', getMessagingCapabilities);
Parse.Cloud.define('messagingCreateConversation', createParseConversation);
Parse.Cloud.define('messagingSendMessage', sendParseMessage);
Parse.Cloud.define('messagingGetMessageByClientId', getMessageByClientId);
Parse.Cloud.define('messagingAddReaction', addParseMessageReaction);
Parse.Cloud.define('messagingMarkRead', markParseMessageRead);
Parse.Cloud.define('messagingSetConversationHidden', setParseConversationHidden);

// Connection
Parse.Cloud.define('getConnections', getConnections);
Parse.Cloud.define('createConnection', createConnection);

// Reservation
Parse.Cloud.define('updateConnection', updateConnection);
Parse.Cloud.define('updateReservation', updateReservation);

// Others
Parse.Cloud.define('sendPush', sendPush);
Parse.Cloud.define('createHandle', createHandle);
// Test
Parse.Cloud.define('test', test);

// --- Cloud code webhooks ----------------------------------------------------
// Connection webhooks
Parse.Cloud.afterSave('Connection', connectionAfterSave);

// User webhooks
Parse.Cloud.beforeSave(Parse.User, userBeforeSave);
Parse.Cloud.afterSave(Parse.User, userAfterSave);
Parse.Cloud.afterDelete(Parse.User, userAfterDelete);

// Parse-native messaging validation and derived state.
Parse.Cloud.beforeSave(
  MESSAGING_CLASSES.CONVERSATION,
  observeMessagingValidation(
    MESSAGING_CLASSES.CONVERSATION,
    'beforeSave',
    beforeSaveConversation,
  ),
);
Parse.Cloud.beforeSave(
  MESSAGING_CLASSES.MEMBER,
  observeMessagingValidation(
    MESSAGING_CLASSES.MEMBER,
    'beforeSave',
    beforeSaveMember,
  ),
);
Parse.Cloud.beforeSave(
  MESSAGING_CLASSES.MESSAGE,
  observeMessagingValidation(
    MESSAGING_CLASSES.MESSAGE,
    'beforeSave',
    beforeSaveMessage,
  ),
);
Parse.Cloud.beforeSave(
  MESSAGING_CLASSES.REACTION,
  observeMessagingValidation(
    MESSAGING_CLASSES.REACTION,
    'beforeSave',
    beforeSaveReaction,
  ),
);
Parse.Cloud.beforeSave(
  MESSAGING_CLASSES.RECEIPT,
  observeMessagingValidation(
    MESSAGING_CLASSES.RECEIPT,
    'beforeSave',
    beforeSaveReceipt,
  ),
);

MESSAGING_LIVE_QUERY_CLASSES.forEach(className => {
  Parse.Cloud.beforeDelete(
    className,
    observeMessagingValidation(
      className,
      'beforeDelete',
      beforeDeleteMessagingObject,
    ),
  );
  Parse.Cloud.beforeSubscribe(className, requireAuthenticatedLiveQuery);
});

Parse.Cloud.afterSave(
  MESSAGING_CLASSES.MEMBER,
  afterSaveMember,
);
Parse.Cloud.afterSave(
  MESSAGING_CLASSES.MESSAGE,
  afterSaveMessage,
);
Parse.Cloud.afterSave(
  MESSAGING_CLASSES.RECEIPT,
  afterSaveReceipt,
);

Parse.Cloud.beforeConnect(requireAuthenticatedLiveQuery);
Parse.Cloud.onLiveQueryEvent(observeLiveQueryEvent);
Parse.Cloud.job(
  'messagingCleanupDeletedAttachments',
  cleanupDeletedMessageAttachments,
);
