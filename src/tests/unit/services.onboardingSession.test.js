jest.mock('../../providers/ParseProvider', () => ({
  __esModule: true,
  default: {
    User: class MockUser {},
  },
}));
jest.mock('../../services/ChatService', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../services/ConnectionService', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../services/PassService', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../services/ReservationService', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../services/ParseMessagingService', () => ({
  addConversationMembers: jest.fn(),
  canonicalDirectContextKey: values =>
    `direct:${values.map(value => value.id).sort().join(':')}`,
  createConversation: jest.fn(),
  getObjectId: value => value && (value.id || value.objectId),
  sendMessage: jest.fn(),
}));
jest.mock('../../services/OnboardingMessagingService', () => ({
  ONBOARDING_MESSAGE_KEYS: {},
  loadMessaging: jest.fn(),
  renderMessage: jest.fn(),
}));

const {
  deriveReachedStep,
  validateContextParams,
} = require('../../services/OnboardingSessionService');

const object = attributes => ({
  get: key => attributes[key],
});

describe('OnboardingSessionService state', () => {
  test('rejects ambiguous invitation authority', () => {
    expect(() =>
      validateContextParams({ reservationId: 'reservation', momentId: 'moment' }))
      .toThrow('Only one');
  });

  test('derives progression only from authoritative user fields', () => {
    const session = object({ completed: false });
    expect(
      deriveReachedStep(object({ smsVerificationStatus: 'pending' }), session),
    ).toBe('phone');
    expect(
      deriveReachedStep(
        object({ smsVerificationStatus: 'approved' }),
        session,
      ),
    ).toBe('name');
    expect(
      deriveReachedStep(
        object({
          familyName: 'Person',
          givenName: 'Test',
          smsVerificationStatus: 'approved',
        }),
        session,
      ),
    ).toBe('faceCapture');
    expect(
      deriveReachedStep(
        object({
          familyName: 'Person',
          givenName: 'Test',
          smallImage: { name: 'profile.heic' },
          smsVerificationStatus: 'approved',
        }),
        session,
      ),
    ).toBe('completed');
  });
});
