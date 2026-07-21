jest.mock('../../providers/ParseProvider', () => ({
  __esModule: true,
  default: {},
}));

const {
  renderMessage,
  validateDocument,
} = require('../../services/OnboardingMessagingService');

const messages = {
  'code.action': 'Continue',
  'code.body': 'Enter the code.',
  'code.completed': 'Verified.',
  'conversation.aiGuideLabel': 'AI guide',
  'conversation.automatedLabel': 'Automated onboarding',
  'guide.subtitle': 'Setting up Jibber',
  'name.action': 'Continue',
  'name.completed': 'Thanks, {{firstName}}.',
  'name.confirm.body': 'Does {{fullName}} look right?',
  'name.first.body': 'What is your name?',
  'name.last.body': 'What is your last name, {{firstName}}?',
  'navigation.revisit': 'Swipe down to revisit',
  'phone.action': 'Continue',
  'phone.completed': 'Code sent.',
  'phone.default.body': 'What is your phone number?',
  'phone.invited.body': 'Confirm your phone number.',
  'photo.body': 'Take a photo.',
  'photo.capture': 'Capture',
  'photo.noFace': 'Move into the frame.',
  'photo.notSmiling': 'Smile when ready.',
  'photo.review': 'Use Photo',
  'photo.uploadError': 'Try saving the photo again.',
  'welcome.invitation.body': '{{inviterName}} invited you.',
  'welcome.moment.body': 'Connect with {{inviterName}}.',
  'welcome.standard.body': 'Welcome.',
  'welcome.action': 'Continue',
};

const conversation = {
  aiGuideLabelKey: 'conversation.aiGuideLabel',
  automatedPromptLabelKey: 'conversation.automatedLabel',
  steps: [
    { id: 'welcome', inputKind: 'action' },
    { id: 'phone', inputKind: 'phone', progressIndex: 0 },
    { id: 'verification', inputKind: 'verificationCode', progressIndex: 1 },
    { id: 'name', inputKind: 'name', progressIndex: 2 },
    { id: 'faceCapture', inputKind: 'faceCapture', progressIndex: 3 },
    { id: 'completed', inputKind: 'chat' },
  ],
  version: 1,
};

describe('OnboardingMessagingService', () => {
  test('accepts the versioned plain-text document used by both clients', () => {
    const document = {
      conversation,
      defaultLocale: 'en',
      locales: { en: messages },
      revision: 8,
      schemaVersion: 1,
    };
    expect(validateDocument(document)).toBe(document);
  });

  test('rejects remote markup and unsupported schema revisions', () => {
    expect(() =>
      validateDocument({
        conversation,
        defaultLocale: 'en',
        locales: { en: { ...messages, 'code.body': '<b>Code</b>' } },
        revision: 1,
        schemaVersion: 1,
      })).toThrow('plain text');
    expect(() =>
      validateDocument({
        conversation,
        defaultLocale: 'en',
        locales: { en: messages },
        revision: 1,
        schemaVersion: 2,
      })).toThrow('Unsupported');
  });

  test('rejects unsupported native input modes and non-boolean-shaped copy', () => {
    expect(() =>
      validateDocument({
        conversation: {
          ...conversation,
          steps: conversation.steps.map(step =>
            step.id === 'name' ? { ...step, inputKind: 'attachments' } : step,
          ),
        },
        defaultLocale: 'en',
        locales: { en: messages },
        revision: 1,
        schemaVersion: 1,
      })).toThrow('not supported by native V1 clients');
    expect(() =>
      validateDocument({
        conversation,
        defaultLocale: ' en ',
        locales: { en: messages },
        revision: 1,
        schemaVersion: 1,
      })).toThrow('valid default locale');
  });

  test('never persists the new user name while retaining inviter tokens', () => {
    expect(
      renderMessage(
        'Hi {{firstName}}. {{inviterName}} invited {{fullName}}.',
        { firstName: 'Private', fullName: 'Private Name', inviterName: 'Maya' },
      ),
    ).toBe('Hi there. Maya invited your name.');
  });
});
