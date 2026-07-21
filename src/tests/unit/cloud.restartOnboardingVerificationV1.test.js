const mockOwnerFirst = jest.fn();

class MockUser {
  constructor(id) {
    this.id = id;
  }
}

class MockQuery {
  equalTo() {
    return this;
  }

  notEqualTo() {
    return this;
  }

  first() {
    return mockOwnerFirst();
  }
}

jest.mock('../../providers/ParseProvider', () => ({
  __esModule: true,
  default: { Query: MockQuery, User: MockUser },
}));

const mockSendCode = jest.fn();
jest.mock('../../services/TwoFAService', () => ({
  __esModule: true,
  default: { sendCode: mockSendCode },
}));

const mockFeatureEnabled = jest.fn();
jest.mock('../../services/OnboardingFeatureService', () => ({
  assertConversationOnboardingEnabled: mockFeatureEnabled,
}));

const mockBegin = jest.fn();
const mockCancel = jest.fn();
const mockMarkSent = jest.fn();
jest.mock('../../services/OnboardingSessionService', () => ({
  beginVerificationRestart: mockBegin,
  cancelVerificationRestart: mockCancel,
  markVerificationRestartSent: mockMarkSent,
}));

jest.mock('../../utils/testUser', () => ({
  __esModule: true,
  default: { isTestUser: jest.fn(() => false) },
}));

const restartOnboardingVerificationV1 =
  require('../../cloud/restartOnboardingVerificationV1').default;

const session = status => ({
  get: field =>
    field === 'pendingVerificationStatus' ? status : undefined,
});

describe('restartOnboardingVerificationV1', () => {
  const user = new MockUser('current-user');
  const request = {
    params: { phoneNumber: '+12065550100' },
    user,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFeatureEnabled.mockResolvedValue(true);
    mockOwnerFirst.mockResolvedValue(undefined);
    mockSendCode.mockResolvedValue({ status: 'pending' });
    mockMarkSent.mockResolvedValue(undefined);
  });

  test('performs eligibility and rate checks before provider side effects', async () => {
    mockBegin.mockRejectedValue(new Error('Too many verification restarts.'));

    await expect(
      restartOnboardingVerificationV1(request),
    ).rejects.toThrow('Too many verification restarts');
    expect(mockOwnerFirst).not.toHaveBeenCalled();
    expect(mockSendCode).not.toHaveBeenCalled();
  });

  test('stores pending state without mutating the authenticated user', async () => {
    const reservedSession = session('requesting');
    mockBegin.mockResolvedValue(reservedSession);

    await expect(
      restartOnboardingVerificationV1(request),
    ).resolves.toEqual({ sent: true });
    expect(mockBegin).toHaveBeenCalledWith(user, '+12065550100');
    expect(mockSendCode).toHaveBeenCalledWith('+12065550100');
    expect(mockMarkSent).toHaveBeenCalledWith(reservedSession, 'pending');
    expect(user.phoneNumber).toBeUndefined();
  });

  test('never sends to a number owned by another account', async () => {
    const reservedSession = session('requesting');
    mockBegin.mockResolvedValue(reservedSession);
    mockOwnerFirst.mockResolvedValue(new MockUser('other-user'));

    await expect(
      restartOnboardingVerificationV1(request),
    ).rejects.toThrow('belongs to another account');
    expect(mockSendCode).not.toHaveBeenCalled();
    expect(mockCancel).toHaveBeenCalledWith(reservedSession, user);
  });
});
