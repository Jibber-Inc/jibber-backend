export const MESSAGING_SCHEMA_VERSION = 1;

export const MESSAGING_CLASSES = Object.freeze({
  CONVERSATION: 'Conversation',
  MEMBER: 'ConversationMember',
  MESSAGE: 'Message',
  REACTION: 'MessageReaction',
  RECEIPT: 'MessageReceipt',
});

export const MESSAGE_CONTENT_TYPES = Object.freeze([
  'text',
  'image',
  'video',
  'media',
  'link',
  'system',
  'moment',
]);

export const MESSAGE_ATTACHMENT_KINDS = Object.freeze([
  'image',
  'video',
  'file',
  'linkPreview',
]);

export const CONVERSATION_TYPES = Object.freeze([
  'direct',
  'group',
  'moment',
  'welcome',
  'pass',
]);

export const MESSAGE_DELIVERY_TYPES = Object.freeze([
  'respectful',
  'conversational',
  'time-sensitive',
]);

export const MESSAGE_RECEIPT_STATES = Object.freeze([
  'sent',
  'delivered',
  'read',
]);

export const CONVERSATION_MEMBER_ROLES = Object.freeze([
  'owner',
  'admin',
  'member',
]);

export const MESSAGING_LIMITS = Object.freeze({
  MAX_ATTACHMENTS: 10,
  MAX_ATTACHMENT_BYTES: 50 * 1024 * 1024,
  MAX_CLIENT_CONVERSATION_ID_LENGTH: 128,
  MAX_CLIENT_MESSAGE_ID_LENGTH: 128,
  MAX_CONTEXT_KEY_LENGTH: 256,
  MAX_EXPRESSIONS: 100,
  MAX_EXPRESSION_ID_LENGTH: 128,
  MAX_LINK_URL_LENGTH: 2048,
  MAX_MESSAGE_TEXT_LENGTH: 10000,
  MAX_REACTION_TYPE_LENGTH: 64,
  MAX_REPLY_SUMMARY_TEXT_LENGTH: 500,
  MAX_TITLE_LENGTH: 200,
  MAX_TYPING_EXPIRY_MS: 15 * 1000,
});

export const MESSAGING_LIVE_QUERY_CLASSES = Object.freeze(
  Object.keys(MESSAGING_CLASSES).map(key => MESSAGING_CLASSES[key]),
);
