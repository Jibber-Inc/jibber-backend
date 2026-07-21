import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';

export class OnboardingMessagingServiceError extends ExtendableError {}

export const ONBOARDING_MESSAGE_KEYS = Object.freeze({
  AI_GUIDE_LABEL: 'conversation.aiGuideLabel',
  AUTOMATED_LABEL: 'conversation.automatedLabel',
  CODE_ACTION: 'code.action',
  CODE_COMPLETED: 'code.completed',
  CODE_PROMPT: 'code.body',
  COMPLETED: 'onboarding.completed',
  GUIDE_SUBTITLE: 'guide.subtitle',
  NAME_ACTION: 'name.action',
  NAME_COMPLETED: 'name.completed',
  NAME_CONFIRM: 'name.confirm.body',
  NAME_EVENT: 'name.event',
  NAME_LAST: 'name.last.body',
  NAME_PROMPT: 'name.first.body',
  NAVIGATION_REVISIT: 'navigation.revisit',
  PHONE_ACTION: 'phone.action',
  PHONE_COMPLETED: 'phone.completed',
  PHONE_DEFAULT: 'phone.default.body',
  PHONE_INVITED: 'phone.invited.body',
  PHOTO_CAPTURE: 'photo.capture',
  PHOTO_COMPLETED: 'photo.completed',
  PHOTO_EVENT: 'photo.event',
  PHOTO_NO_FACE: 'photo.noFace',
  PHOTO_NOT_SMILING: 'photo.notSmiling',
  PHOTO_PROMPT: 'photo.body',
  PHOTO_REVIEW: 'photo.review',
  PHOTO_UPLOAD_ERROR: 'photo.uploadError',
  WELCOME_INVITATION: 'welcome.invitation.body',
  WELCOME_MOMENT: 'welcome.moment.body',
  WELCOME_STANDARD: 'welcome.standard.body',
  WELCOME_ACTION: 'welcome.action',
});

const canonicalConversation = Object.freeze({
  aiGuideLabelKey: ONBOARDING_MESSAGE_KEYS.AI_GUIDE_LABEL,
  automatedPromptLabelKey: ONBOARDING_MESSAGE_KEYS.AUTOMATED_LABEL,
  steps: [
    { id: 'welcome', inputKind: 'action' },
    { id: 'phone', inputKind: 'phone', progressIndex: 0 },
    { id: 'verification', inputKind: 'verificationCode', progressIndex: 1 },
    { id: 'name', inputKind: 'name', progressIndex: 2 },
    { id: 'faceCapture', inputKind: 'faceCapture', progressIndex: 3 },
    { id: 'completed', inputKind: 'chat' },
  ],
  version: 1,
});

const fallbackDocument = Object.freeze({
  conversation: canonicalConversation,
  defaultLocale: 'en',
  locales: {
    en: {
      'code.action': 'Continue',
      'code.body': 'Enter the code Jibber texted you.',
      'code.completed': 'You’re verified.',
      'conversation.aiGuideLabel': 'AI guide',
      'conversation.automatedLabel': 'Automated onboarding',
      'guide.subtitle': 'Setting up Jibber',
      'name.action': 'Continue',
      'name.completed':
        'Great to meet you, {{firstName}}. Let’s get Jibber set up.',
      'name.confirm.body': 'Does {{fullName}} look right?',
      'name.event': 'Name added.',
      'name.first.body': 'What’s your name?',
      'name.last.body': 'Thanks, {{firstName}}. What’s your last name?',
      'navigation.revisit': 'Swipe down to revisit',
      'onboarding.completed':
        'You’re all set. You can keep chatting with me here.',
      'phone.action': 'Continue',
      'phone.completed': 'Perfect — I sent you a code.',
      'phone.default.body': 'What’s your phone number?',
      'phone.invited.body': 'Confirm your phone number.',
      'photo.body':
        'One last thing—let’s take a profile photo so people know it’s you.',
      'photo.capture': 'Capture',
      'photo.completed': 'Profile photo added.',
      'photo.event': 'Profile photo added.',
      'photo.noFace': 'Move into the frame so I can see your face.',
      'photo.notSmiling': 'Smile when you’re ready.',
      'photo.review': 'Use Photo',
      'photo.uploadError': 'I couldn’t save that photo. Try again.',
      'welcome.invitation.body':
        '{{inviterName}} invited you to connect on Jibber. I’ll help you finish setting up your account.',
      'welcome.moment.body':
        'Connect with {{inviterName}} to continue. You can return to the Moment without changing anything.',
      'welcome.standard.body': 'Welcome to Jibber. I’ll help you get set up.',
      'welcome.action': 'Continue',
    },
  },
  revision: 0,
  schemaVersion: 1,
});

const backendOnlyKeys = new Set([
  ONBOARDING_MESSAGE_KEYS.COMPLETED,
  ONBOARDING_MESSAGE_KEYS.NAME_EVENT,
  ONBOARDING_MESSAGE_KEYS.PHOTO_COMPLETED,
  ONBOARDING_MESSAGE_KEYS.PHOTO_EVENT,
]);
const conversationLabelKeys = new Set([
  ONBOARDING_MESSAGE_KEYS.AI_GUIDE_LABEL,
  ONBOARDING_MESSAGE_KEYS.AUTOMATED_LABEL,
]);
const requiredLegacyKeys = Object.values(ONBOARDING_MESSAGE_KEYS).filter(
  key => !backendOnlyKeys.has(key) && !conversationLabelKeys.has(key),
);
const maximumLengthByKey = Object.freeze({
  [ONBOARDING_MESSAGE_KEYS.AI_GUIDE_LABEL]: 80,
  [ONBOARDING_MESSAGE_KEYS.AUTOMATED_LABEL]: 80,
  [ONBOARDING_MESSAGE_KEYS.CODE_ACTION]: 32,
  [ONBOARDING_MESSAGE_KEYS.CODE_COMPLETED]: 160,
  [ONBOARDING_MESSAGE_KEYS.GUIDE_SUBTITLE]: 80,
  [ONBOARDING_MESSAGE_KEYS.NAME_ACTION]: 32,
  [ONBOARDING_MESSAGE_KEYS.NAME_COMPLETED]: 160,
  [ONBOARDING_MESSAGE_KEYS.NAVIGATION_REVISIT]: 80,
  [ONBOARDING_MESSAGE_KEYS.PHONE_ACTION]: 32,
  [ONBOARDING_MESSAGE_KEYS.PHONE_COMPLETED]: 160,
  [ONBOARDING_MESSAGE_KEYS.PHOTO_CAPTURE]: 32,
  [ONBOARDING_MESSAGE_KEYS.PHOTO_NO_FACE]: 160,
  [ONBOARDING_MESSAGE_KEYS.PHOTO_NOT_SMILING]: 160,
  [ONBOARDING_MESSAGE_KEYS.PHOTO_REVIEW]: 32,
  [ONBOARDING_MESSAGE_KEYS.WELCOME_ACTION]: 32,
  [ONBOARDING_MESSAGE_KEYS.PHOTO_UPLOAD_ERROR]: 160,
});

const normalizedLocale = value =>
  String(value || '').trim().replace(/_/g, '-').toLowerCase();

const isValidLocale = value => {
  const locale = String(value || '');
  const trimmed = locale.trim();
  return Boolean(
    trimmed &&
      Array.from(trimmed).length <= 35 &&
      /^[\p{L}\p{N}_-]+$/u.test(locale),
  );
};

const assertPlainText = (key, value) => {
  const maximumLength = maximumLengthByKey[key] || 400;
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    Array.from(value).length > maximumLength
  ) {
    throw new OnboardingMessagingServiceError(
      `Onboarding message ${key} must contain 1-${maximumLength} characters.`,
    );
  }
  const containsControlCharacter = Array.from(value).some(character => {
    const characterCode = character.charCodeAt(0);
    return (
      characterCode <= 8 ||
      (characterCode >= 11 && characterCode <= 31) ||
      (characterCode >= 127 && characterCode <= 159)
    );
  });
  if (
    /[<>`]/.test(value) ||
    /https?:\/\//i.test(value) ||
    /\]\(|\*\*/.test(value) ||
    containsControlCharacter
  ) {
    throw new OnboardingMessagingServiceError(
      `Onboarding message ${key} must be plain text.`,
    );
  }
  const validToken = /\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g;
  Array.from(value.matchAll(validToken)).forEach(match => {
    if (['firstName', 'fullName', 'inviterName'].indexOf(match[1]) === -1) {
      throw new OnboardingMessagingServiceError(
        `Onboarding message ${key} contains an unsupported token.`,
      );
    }
  });
  const withoutTokens = value.replace(validToken, '');
  if (withoutTokens.includes('{{') || withoutTokens.includes('}}')) {
    throw new OnboardingMessagingServiceError(
      `Onboarding message ${key} contains a malformed token.`,
    );
  }
};

const assertRequiredMessages = (messages, locale, keys) => {
  keys.forEach(key => {
    if (!messages[key]) {
      throw new OnboardingMessagingServiceError(
        `Onboarding messaging locale ${locale} is missing ${key}.`,
      );
    }
  });
};

const assertConversationConfiguration = conversation => {
  if (!conversation || typeof conversation !== 'object') {
    throw new OnboardingMessagingServiceError(
      'Onboarding conversation configuration must be an object.',
    );
  }
  const scalarMatches =
    conversation.version === canonicalConversation.version &&
    conversation.automatedPromptLabelKey ===
      canonicalConversation.automatedPromptLabelKey &&
    conversation.aiGuideLabelKey === canonicalConversation.aiGuideLabelKey;
  const steps = Array.isArray(conversation.steps) ? conversation.steps : [];
  const stepsMatch =
    steps.length === canonicalConversation.steps.length &&
    steps.every((step, index) => {
      const expected = canonicalConversation.steps[index];
      return (
        step.id === expected.id &&
        step.inputKind === expected.inputKind &&
        step.progressIndex === expected.progressIndex
      );
    });
  if (!scalarMatches || !stepsMatch) {
    throw new OnboardingMessagingServiceError(
      'Onboarding conversation configuration is not supported by native V1 clients.',
    );
  }
};

export const validateDocument = document => {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new OnboardingMessagingServiceError(
      'onboardingMessagingV1 must be an object.',
    );
  }
  if (Buffer.byteLength(JSON.stringify(document), 'utf8') > 64 * 1024) {
    throw new OnboardingMessagingServiceError(
      'onboardingMessagingV1 exceeds 65536 bytes.',
    );
  }
  if (document.schemaVersion !== 1) {
    throw new OnboardingMessagingServiceError(
      'Unsupported onboarding messaging schema.',
    );
  }
  if (!Number.isInteger(document.revision) || document.revision < 0) {
    throw new OnboardingMessagingServiceError(
      'Onboarding messaging revision must be a non-negative integer.',
    );
  }
  const defaultLocale = normalizedLocale(document.defaultLocale);
  const localeEntries = Object.entries(document.locales || {});
  if (
    !isValidLocale(document.defaultLocale) ||
    !document.locales ||
    typeof document.locales !== 'object' ||
    Array.isArray(document.locales) ||
    localeEntries.length === 0 ||
    localeEntries.length > 20 ||
    localeEntries.some(([locale]) => !isValidLocale(locale))
  ) {
    throw new OnboardingMessagingServiceError(
      'Onboarding messaging requires valid default locale and locales.',
    );
  }
  const english = localeEntries.find(
    ([locale]) => normalizedLocale(locale) === 'en',
  );
  if (!english) {
    throw new OnboardingMessagingServiceError(
      'Onboarding messaging requires an English locale.',
    );
  }
  const defaultEntry = localeEntries.find(
    ([locale]) => normalizedLocale(locale) === defaultLocale,
  );
  if (!defaultEntry) {
    throw new OnboardingMessagingServiceError(
      'Onboarding messaging is missing its default locale.',
    );
  }
  assertRequiredMessages(english[1], english[0], requiredLegacyKeys);
  if (defaultEntry[0] !== english[0]) {
    assertRequiredMessages(defaultEntry[1], defaultEntry[0], requiredLegacyKeys);
  }
  if (document.conversation !== undefined) {
    assertConversationConfiguration(document.conversation);
    const labelKeys = Array.from(conversationLabelKeys);
    assertRequiredMessages(english[1], english[0], labelKeys);
    if (defaultEntry[0] !== english[0]) {
      assertRequiredMessages(defaultEntry[1], defaultEntry[0], labelKeys);
    }
  }
  localeEntries.forEach(([, messages]) => {
    if (!messages || typeof messages !== 'object' || Array.isArray(messages)) {
      throw new OnboardingMessagingServiceError(
        'Each onboarding locale must be an object.',
      );
    }
    Object.entries(messages).forEach(([key, value]) => {
      assertPlainText(key, value);
    });
  });
  if (
    document.guideUserId !== undefined &&
    (typeof document.guideUserId !== 'string' ||
      !/^[\p{L}\p{N}_-]{1,128}$/u.test(document.guideUserId.trim()))
  ) {
    throw new OnboardingMessagingServiceError(
      'Onboarding guideUserId is invalid.',
    );
  }
  return document;
};

const getConfiguredDocument = async () => {
  const config = await Parse.Config.get({ useMasterKey: true });
  const configuredValue = config.get('onboardingMessagingV1');
  if (!configuredValue) return fallbackDocument;
  try {
    const document =
      typeof configuredValue === 'string'
        ? JSON.parse(configuredValue)
        : configuredValue;
    return validateDocument(document);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Invalid onboardingMessagingV1; using fallback.', error.message);
    return fallbackDocument;
  }
};

const selectMessages = (document, requestedLocale) => {
  const candidates = [
    normalizedLocale(requestedLocale),
    normalizedLocale(document.defaultLocale),
    'en',
  ].filter(Boolean);
  const entries = Object.entries(document.locales);
  const selected = candidates
    .map(candidate =>
      entries.find(([locale]) => {
        const normalized = normalizedLocale(locale);
        return (
          normalized === candidate ||
          normalized.split('-')[0] === candidate.split('-')[0]
        );
      }),
    )
    .find(Boolean);
  const english = entries.find(([locale]) => normalizedLocale(locale) === 'en');
  return {
    locale: selected ? selected[0] : english[0],
    messages: {
      ...fallbackDocument.locales.en,
      ...english[1],
      ...(selected ? selected[1] : {}),
    },
  };
};

export const resolveMessagingDocument = (document, requestedLocale) => {
  validateDocument(document);
  const selected = selectMessages(document, requestedLocale);
  return {
    document,
    guideUserId:
      (document.guideUserId && document.guideUserId.trim()) ||
      process.env.ONBOARDING_GUIDE_USER_ID,
    locale: selected.locale,
    messages: selected.messages,
    revision: document.revision,
  };
};

export const loadMessaging = async requestedLocale =>
  resolveMessagingDocument(await getConfiguredDocument(), requestedLocale);

export const renderMessage = (template, tokens = {}, options = {}) => {
  const rendered = String(template || '').replace(
    /\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g,
    (match, token) => {
      if (token === 'firstName' || token === 'fullName') {
        return token === 'firstName' ? 'there' : 'your name';
      }
      return tokens[token] || (token === 'inviterName' ? 'Someone' : '');
    },
  );
  return options.maximumLength
    ? rendered.slice(0, options.maximumLength)
    : rendered;
};

export default {
  loadMessaging,
  renderMessage,
  resolveMessagingDocument,
  validateDocument,
};
