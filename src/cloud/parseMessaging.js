import {
  addReaction,
  cleanupDeletedAttachments,
  createConversation,
  getCapabilities,
  getMessageByClientId as resolveMessageByClientId,
  markRead,
  sendMessage,
  setConversationHidden,
} from '../services/ParseMessagingService';
import MessagingMetricsService from '../services/MessagingMetricsService';
import { assertMinimumAppVersion } from '../utils/appVersion';

const requireUser = request => {
  if (!request.user) throw new Error('Authentication is required.');
  return request.user;
};

const requireMessagingAvailable = () => {
  if (!getCapabilities().available) {
    throw new Error('Parse messaging is not enabled.');
  }
};

const measureWrite = (operation, request, callback) =>
  MessagingMetricsService.measure(
    'cloud_write',
    {
      operation,
      userId: request.user && request.user.id,
    },
    () => {
      requireMessagingAvailable();
      assertMinimumAppVersion(request);
      return callback();
    },
  );

export const getMessagingCapabilities = request => {
  requireUser(request);
  return getCapabilities();
};

export const createParseConversation = request =>
  measureWrite('create_conversation', request, () =>
    createConversation(requireUser(request), request.params),
  );

export const sendParseMessage = request =>
  measureWrite('send_message', request, () =>
    sendMessage(requireUser(request), request.params),
  );

export const getMessageByClientId = request =>
  MessagingMetricsService.measure(
    'idempotency_recovery',
    {
      userId: request.user && request.user.id,
    },
    () => {
      requireMessagingAvailable();
      return resolveMessageByClientId(
        requireUser(request),
        request.params,
      );
    },
  );

export const addParseMessageReaction = request =>
  measureWrite('add_reaction', request, () =>
    addReaction(requireUser(request), request.params),
  );

export const markParseMessageRead = request =>
  measureWrite('mark_read', request, () =>
    markRead(requireUser(request), request.params),
  );

export const setParseConversationHidden = request =>
  measureWrite('set_conversation_hidden', request, () =>
    setConversationHidden(requireUser(request), request.params),
  );

export const cleanupDeletedMessageAttachments = async request => {
  if (request && request.message) {
    request.message('Purging attachments for expired message tombstones.');
  }
  const deletedCount = await cleanupDeletedAttachments();
  return { deletedCount };
};

export const requireAuthenticatedLiveQuery = request => {
  if (!request.user && !request.master) {
    throw new Error('Authentication is required for messaging LiveQuery.');
  }
};

export const observeLiveQueryEvent = event => {
  const ignoredEvents = ['client_connect', 'client_disconnect'];
  if (ignoredEvents.indexOf(event.event) !== -1) return;

  const fields = {
    clients: event.clients,
    event: event.event,
    subscriptions: event.subscriptions,
    userId: event.user && event.user.id,
  };
  if (event.error) {
    MessagingMetricsService.error('livequery_event', event.error, fields);
  } else {
    MessagingMetricsService.info('livequery_event', fields);
  }
};

export default {
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
};
