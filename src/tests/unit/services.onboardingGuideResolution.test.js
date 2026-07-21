const mockUsers = new Map();
const mockCheckReservation = jest.fn();

class MockUser {
  constructor(id, attributes = {}) {
    this.id = id;
    this.attributes = attributes;
  }

  get(field) {
    return this.attributes[field];
  }
}

class MockQuery {
  constructor(className) {
    this.className = className;
  }

  equalTo() {
    return this;
  }

  get(objectId) {
    if (this.className === MockUser) {
      return Promise.resolve(mockUsers.get(objectId));
    }
    return Promise.resolve(undefined);
  }

  first() {
    return Promise.resolve(undefined);
  }
}

jest.mock('../../providers/ParseProvider', () => ({
  __esModule: true,
  default: {
    Query: MockQuery,
    Role: class MockRole {},
    User: MockUser,
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
  default: { checkReservation: mockCheckReservation },
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
  resolveGuide,
} = require('../../services/OnboardingSessionService');

describe('Onboarding guide resolution', () => {
  const user = new MockUser('new-user');

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsers.clear();
    delete process.env.MAYA_BOT_USER_ID;
  });

  afterEach(() => {
    delete process.env.MAYA_BOT_USER_ID;
  });

  test('uses the reservation creator without falling back to Maya', async () => {
    const inviter = new MockUser('inviter');
    mockUsers.set(inviter.id, inviter);
    mockCheckReservation.mockResolvedValue({
      get: field => (field === 'createdBy' ? inviter : undefined),
      id: 'reservation',
    });

    await expect(
      resolveGuide(
        user,
        { reservationId: 'reservation' },
        { guideUserId: 'configured-guide' },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        contextObjectId: 'reservation',
        contextType: 'reservation',
        guide: inviter,
        source: 'reservation',
      }),
    );
  });

  test('marks the explicitly configured Maya account as an AI guide', async () => {
    const maya = new MockUser('maya-user');
    mockUsers.set(maya.id, maya);
    process.env.MAYA_BOT_USER_ID = maya.id;

    await expect(
      resolveGuide(user, {}, { guideUserId: maya.id }),
    ).resolves.toEqual({ guide: maya, source: 'maya' });
  });

  test('does not silently fall back when an invitation is invalid', async () => {
    mockCheckReservation.mockRejectedValue(new Error('already claimed'));
    await expect(
      resolveGuide(
        user,
        { reservationId: 'reservation' },
        { guideUserId: 'configured-guide' },
      ),
    ).rejects.toThrow('already claimed');
  });

  test('rejects an already claimed invitation even for its claimant', async () => {
    const inviter = new MockUser('inviter');
    mockUsers.set(inviter.id, inviter);
    mockCheckReservation.mockResolvedValue({
      get: field => ({
        createdBy: inviter,
        isClaimed: true,
        user,
      })[field],
      id: 'reservation',
    });

    await expect(
      resolveGuide(
        user,
        { reservationId: 'reservation' },
        { guideUserId: 'configured-guide' },
      ),
    ).rejects.toThrow('already been claimed');
  });
});
