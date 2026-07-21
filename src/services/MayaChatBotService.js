import Parse from '../providers/ParseProvider';
import { MESSAGING_CLASSES } from '../constants/messaging';
import MessagingMetricsService from './MessagingMetricsService';
import { isTrustedOnboardingWrite } from './OnboardingWritePolicy';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENAI_IMAGE_GENERATIONS_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_IMAGE_EDITS_URL = 'https://api.openai.com/v1/images/edits';
const DEFAULT_MODEL = 'gpt-5.4-mini';
const DEFAULT_IMAGE_MODEL = 'gpt-image-2';
const DEFAULT_IMAGE_QUALITY = 'low';
const DEFAULT_IMAGE_SIZE = '1024x1024';
const HISTORY_LIMIT = 12;
const MAX_BOT_REPLY_LENGTH = 1200;

const masterOptions = { useMasterKey: true };

const getObjectId = pointer => pointer && (pointer.id || pointer.objectId);

const isNewRequest = request => !request.original;

export const getConfig = () => ({
  apiKey: process.env.OPENAI_API_KEY,
  botUserId: process.env.MAYA_BOT_USER_ID,
  enabled: process.env.AI_CHATBOT_ENABLED === 'true',
  imageModel: process.env.MAYA_BOT_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
  imageQuality: process.env.MAYA_BOT_IMAGE_QUALITY || DEFAULT_IMAGE_QUALITY,
  imageSize: process.env.MAYA_BOT_IMAGE_SIZE || DEFAULT_IMAGE_SIZE,
  model: process.env.MAYA_BOT_MODEL || DEFAULT_MODEL,
});

const isConfigured = config =>
  Boolean(config.enabled && config.apiKey && config.botUserId);

const getText = message => (message.get('text') || '').trim();

const IMAGE_FOLLOWUP_CLARIFICATION_PATTERNS = [
  /what would you like (?:the )?(?:image|picture|photo|illustration|drawing) to show/i,
  /what should (?:the )?(?:image|picture|photo|illustration|drawing) show/i,
  /what would you like me to (?:make|create|generate|draw)/i,
  /describe a safer look/i,
  /describe (?:the )?(?:image|picture|photo|illustration|drawing)/i,
  /image prompt/i,
];

const GENERIC_IMAGE_FOLLOWUP_RESPONSES = new Set([
  'great',
  'k',
  'ok',
  'okay',
  'please',
  'sure',
  'that sounds good',
  'yes',
  'yeah',
  'yep',
]);

const normalizeFollowupResponse = text =>
  (text || '')
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ');

const isImageClarificationText = text =>
  IMAGE_FOLLOWUP_CLARIFICATION_PATTERNS.some(pattern => pattern.test(text || ''));

const isGenericImageFollowupResponse = text =>
  GENERIC_IMAGE_FOLLOWUP_RESPONSES.has(normalizeFollowupResponse(text));

export const extractImagePrompt = text => {
  const trimmed = (text || '').trim();
  if (!trimmed) return undefined;

  const commandMatch = trimmed.match(/^\/(?:image|img|draw)\s+(.+)/i);
  if (commandMatch) return commandMatch[1].trim();

  const naturalMatch = trimmed.match(
    /^(?:(?:please|can\s+you|could\s+you|would\s+you|will\s+you)\s+)?(?:create|generate|make|draw|send(?:\s+me)?)\s+(?:an?\s+)?(?:image|picture|photo|illustration|drawing)\s+(?:of|showing|for|with)?\s*(.+)$/i,
  );
  if (naturalMatch) return naturalMatch[1].trim();

  const sendImageMatch = trimmed.match(
    /^(?:(?:please|can\s+you|could\s+you|would\s+you|will\s+you)\s+)?send\s+me\s+(?:an?\s+)?(?:image|picture|photo|illustration|drawing)\s+(?:of|showing|for|with)?\s*(.+)$/i,
  );
  if (sendImageMatch) return sendImageMatch[1].trim();

  return undefined;
};

export const extractImageFollowupPrompt = (
  text,
  recentMessages,
  botUserId,
  sourceMessageId,
) => {
  const trimmed = (text || '').trim();
  if (!trimmed) return undefined;
  if (extractImagePrompt(trimmed)) return undefined;
  if (isGenericImageFollowupResponse(trimmed)) return undefined;

  const previousMessages = recentMessages.filter(
    message => message.id !== sourceMessageId,
  );
  const previousMessage = previousMessages[previousMessages.length - 1];
  if (!previousMessage) return undefined;

  const isPreviousMessageFromBot =
    getObjectId(previousMessage.get('author')) === botUserId;
  if (!isPreviousMessageFromBot) return undefined;
  if (!isImageClarificationText(getText(previousMessage))) return undefined;

  return trimmed;
};

export const shouldUseMayaProfileReference = prompt =>
  /\b(?:maya|yourself|you|your|herself|her)\b/i.test(prompt || '');

const buildMayaProfileReferencePrompt = prompt => {
  const normalizedPrompt = prompt.replace(
    /\b(?:maya|yourself|you|your|herself|her)\b/gi,
    'the same character',
  );

  return `Use the provided images as the complete visual reference set for Maya. Preserve the same character identity, face, hairstyle, color palette, and illustration style. Create a safe, non-sexual, fully clothed avatar/fashion image. Requested change: ${normalizedPrompt} Keep the result wholesome and suitable for all ages. Do not invent a different person.`;
};

export const isGenericImageRequest = text => {
  const trimmed = (text || '').trim();
  if (!trimmed) return false;

  return /^(?:(?:please|can\s+you|could\s+you|would\s+you|will\s+you)\s+)?(?:create|generate|make|draw|send(?:\s+me)?)\s+(?:an?\s+)?(?:image|picture|photo|illustration|drawing)\s*$/i.test(trimmed);
};

const isTextMessage = message =>
  !message.get('isDeleted') &&
  (message.get('contentType') || 'text') === 'text' &&
  getText(message).length > 0;

const getBotMembership = (conversation, botUser) =>
  new Parse.Query(MESSAGING_CLASSES.MEMBER)
    .equalTo('conversation', conversation)
    .equalTo('user', botUser)
    .equalTo('active', true)
    .first(masterOptions);

const getBotUser = botUserId =>
  new Parse.Query(Parse.User).get(botUserId, masterOptions);

const getRecentMessages = async (conversation, threadRoot) => {
  const threadRootId = getObjectId(threadRoot);
  const messageQuery = new Parse.Query(MESSAGING_CLASSES.MESSAGE)
    .equalTo('conversation', conversation)
    .notEqualTo('isDeleted', true)
    .include('author')
    .descending('createdAt');

  if (!threadRootId) {
    const messages = await messageQuery
      .limit(HISTORY_LIMIT)
      .find(masterOptions);

    return messages.reverse().filter(message => getText(message).length > 0);
  }

  const [root, replies] = await Promise.all([
    new Parse.Query(MESSAGING_CLASSES.MESSAGE)
      .include('author')
      .get(threadRootId, masterOptions),
    messageQuery
      .equalTo('replyTo', threadRoot)
      .limit(HISTORY_LIMIT - 1)
      .find(masterOptions),
  ]);

  return [root, ...replies.reverse()].filter(
    message => getText(message).length > 0,
  );
};

export const buildModelInput = (messages, botUserId) =>
  messages.map(message => ({
    role: getObjectId(message.get('author')) === botUserId ? 'assistant' : 'user',
    content: getText(message),
  }));

const extractResponseText = responseBody => {
  if (responseBody.output_text) return responseBody.output_text.trim();

  const output = responseBody.output || [];
  const text = output
    .flatMap(item => item.content || [])
    .map(content => content.text || '')
    .join('')
    .trim();

  return text;
};

const callOpenAI = async ({ apiKey, model }, input) => {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      instructions:
        'You are Maya Hart, a friendly staging-only AI chat bot for the Jibber app. Reply conversationally in 1-3 concise sentences. Help the tester exercise chat features, but do not claim to be a real person. The app can generate and send images for explicit image requests before this text path is used; do not say you cannot send images.',
      max_output_tokens: 220,
      model,
      store: false,
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    const message =
      body &&
      body.error &&
      (body.error.message || body.error.code || body.error.type);
    throw new Error(message || `OpenAI request failed with ${response.status}`);
  }

  const text = extractResponseText(body);
  if (!text) throw new Error('OpenAI response did not contain text.');
  return text.slice(0, MAX_BOT_REPLY_LENGTH);
};

const callOpenAIImage = async ({
  apiKey,
  imageModel,
  imageQuality,
  imageSize,
}, prompt, referenceImageUrls = []) => {
  const hasReferenceImage = referenceImageUrls.length > 0;
  const url = hasReferenceImage
    ? OPENAI_IMAGE_EDITS_URL
    : OPENAI_IMAGE_GENERATIONS_URL;
  const requestBody = hasReferenceImage
    ? {
      images: referenceImageUrls.map(imageUrl => ({ image_url: imageUrl })),
      model: imageModel,
      n: 1,
      prompt: buildMayaProfileReferencePrompt(prompt),
      quality: imageQuality,
      size: imageSize,
    }
    : {
      model: imageModel,
      n: 1,
      prompt,
      quality: imageQuality,
      size: imageSize,
    };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const responseBody = await response.json();
  if (!response.ok) {
    const message =
      responseBody &&
      responseBody.error &&
      (responseBody.error.message || responseBody.error.code || responseBody.error.type);
    throw new Error(message || `OpenAI image request failed with ${response.status}`);
  }

  const b64Json =
    responseBody &&
    responseBody.data &&
    responseBody.data[0] &&
    responseBody.data[0].b64_json;
  if (!b64Json) throw new Error('OpenAI image response did not contain image data.');

  return {
    b64Json,
    byteCount: Buffer.byteLength(b64Json, 'base64'),
    contentType: 'image/png',
  };
};

const buildClientMessageId = sourceMessage =>
  `maya-bot:${sourceMessage.id}`;

const buildImageClarificationClientMessageId = sourceMessage =>
  `maya-bot-image-clarification:${sourceMessage.id}`;

const buildImageClientMessageId = sourceMessage =>
  `maya-bot-image:${sourceMessage.id}`;

const buildImageErrorClientMessageId = sourceMessage =>
  `maya-bot-image-error:${sourceMessage.id}`;

const buildThreadReplyParams = sourceMessage => {
  const replyToId = getObjectId(sourceMessage.get('replyTo'));
  return replyToId ? { replyToId } : {};
};

const createImageFile = async (sourceMessage, image) => {
  const fileName = `maya-${sourceMessage.id}.png`;
  const file = new Parse.File(fileName, { base64: image.b64Json }, image.contentType);
  await file.save(masterOptions);
  return { file, fileName };
};

const buildImageCaption = prompt =>
  `Generated image for: ${prompt.slice(0, 180)}`;

const getFileUrl = file => {
  if (!file) return undefined;
  if (typeof file.url === 'function') return file.url();
  if (typeof file.url === 'string') return file.url;
  return undefined;
};

export const getMayaReferenceImageUrls = botUser => {
  if (!botUser || !botUser.get) return [];

  const files = [
    botUser.get('smallImage'),
    ...(Array.isArray(botUser.get('mayaReferenceImages'))
      ? botUser.get('mayaReferenceImages')
      : []),
  ];

  return Array.from(
    new Set(files.map(getFileUrl).filter(Boolean)),
  ).slice(0, 5);
};

const sanitizeErrorMessage = error =>
  (error && error.message ? error.message : String(error || 'Unknown error'))
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .slice(0, 240);

const isImageSafetyError = error =>
  /safety|safety_violations|moderation|blocked/i.test(
    error && error.message ? error.message : String(error || ''),
  );

const buildImageFailureText = error =>
  isImageSafetyError(error)
    ? 'That image request was blocked by the image safety system. I can still make a fully clothed outfit or portrait image if you describe a safer look.'
    : 'I could not generate that image. Try a simpler prompt or a different subject.';

export const shouldRespondToMessage = (request, config = getConfig()) => {
  const message = request.object;
  if (!isConfigured(config)) return false;
  if (!isNewRequest(request)) return false;
  if (!isTextMessage(message)) return false;
  if (isTrustedOnboardingWrite(request)) return false;
  if (getObjectId(message.get('author')) === config.botUserId) return false;
  return true;
};

export const afterSaveMessage = async (request, sendMessageFn) => {
  const config = getConfig();
  if (!shouldRespondToMessage(request, config)) return undefined;
  if (!sendMessageFn) throw new Error('sendMessage function is required.');

  const sourceMessage = request.object;
  const conversation = sourceMessage.get('conversation');
  const sourceAuthorId = getObjectId(sourceMessage.get('author'));

  try {
    const botUser = await getBotUser(config.botUserId);
    const botMembership = await getBotMembership(conversation, botUser);
    if (!botMembership) return undefined;

    const recentMessages = await getRecentMessages(
      conversation,
      sourceMessage.get('replyTo'),
    );
    const directImagePrompt = extractImagePrompt(getText(sourceMessage));
    const imagePrompt =
      directImagePrompt ||
      extractImageFollowupPrompt(
        getText(sourceMessage),
        recentMessages,
        config.botUserId,
        sourceMessage.id,
      );

    if (!imagePrompt && isGenericImageRequest(getText(sourceMessage))) {
      return sendMessageFn(botUser, {
        clientMessageId: buildImageClarificationClientMessageId(sourceMessage),
        conversationId: conversation.id,
        deliveryType: 'conversational',
        metadata: {
          bot: 'maya',
          imageIntent: 'awaiting_prompt',
          sourceMessageId: sourceMessage.id,
        },
        ...buildThreadReplyParams(sourceMessage),
        text: 'Sure — what would you like the image to show?',
      });
    }

    if (imagePrompt) {
      let imageReference;
      let referenceImageCount = 0;
      try {
        const mayaReferenceImageUrls = shouldUseMayaProfileReference(imagePrompt)
          ? getMayaReferenceImageUrls(botUser)
          : [];
        referenceImageCount = mayaReferenceImageUrls.length;
        imageReference = referenceImageCount
          ? 'maya_reference_images'
          : undefined;
        const image = await callOpenAIImage(
          config,
          imagePrompt,
          mayaReferenceImageUrls,
        );
        const savedImage = await createImageFile(sourceMessage, image);

        return sendMessageFn(botUser, {
          attachments: [
            {
              byteCount: image.byteCount,
              file: savedImage.file,
              fileName: savedImage.fileName,
              id: `maya-image-${sourceMessage.id}`,
              kind: 'image',
              mimeType: image.contentType,
            },
          ],
          clientMessageId: buildImageClientMessageId(sourceMessage),
          contentType: 'image',
          conversationId: conversation.id,
          deliveryType: 'conversational',
          metadata: {
            bot: 'maya',
            imageModel: config.imageModel,
            imagePrompt,
            ...(imageReference
              ? { imageReference, referenceImageCount }
              : {}),
            sourceMessageId: sourceMessage.id,
          },
          ...buildThreadReplyParams(sourceMessage),
          text: buildImageCaption(imagePrompt),
        });
      } catch (imageError) {
        MessagingMetricsService.error('maya_bot_image_failed', imageError, {
          conversationId: getObjectId(conversation),
          messageId: sourceMessage.id,
          sourceAuthorId,
        });

        return sendMessageFn(botUser, {
          clientMessageId: buildImageErrorClientMessageId(sourceMessage),
          conversationId: conversation.id,
          deliveryType: 'conversational',
          metadata: {
            bot: 'maya',
            imageError: sanitizeErrorMessage(imageError),
            imagePrompt,
            ...(imageReference
              ? { imageReference, referenceImageCount }
              : {}),
            sourceMessageId: sourceMessage.id,
          },
          ...buildThreadReplyParams(sourceMessage),
          text: buildImageFailureText(imageError),
        });
      }
    }

    const replyText = await callOpenAI(config, buildModelInput(recentMessages, config.botUserId));

    return sendMessageFn(botUser, {
      clientMessageId: buildClientMessageId(sourceMessage),
      conversationId: conversation.id,
      deliveryType: 'conversational',
      metadata: {
        bot: 'maya',
        sourceMessageId: sourceMessage.id,
      },
      ...buildThreadReplyParams(sourceMessage),
      text: replyText,
    });
  } catch (error) {
    MessagingMetricsService.error('maya_bot_failed', error, {
      conversationId: getObjectId(conversation),
      messageId: sourceMessage.id,
      sourceAuthorId,
    });
    return undefined;
  }
};

export default {
  afterSaveMessage,
  buildModelInput,
  extractImageFollowupPrompt,
  extractImagePrompt,
  getConfig,
  getMayaReferenceImageUrls,
  isGenericImageRequest,
  shouldRespondToMessage,
};
