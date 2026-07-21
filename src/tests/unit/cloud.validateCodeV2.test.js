import validateCodeV2 from '../../cloud/validateCodeV2';
import { validateCodeWithUser } from '../../cloud/validateCode';
import { assertConversationOnboardingEnabled } from '../../services/OnboardingFeatureService';
import {
  ensureOnboardingSession,
  getSessionForUser,
  isUserOnboardingComplete,
  syncOnboardingConversation,
} from '../../services/OnboardingSessionService';
import { loadMessaging } from '../../services/OnboardingMessagingService';

jest.mock('../../cloud/validateCode', () => ({
  validateCodeWithUser: jest.fn(),
}));
jest.mock('../../services/OnboardingFeatureService', () => ({
  assertConversationOnboardingEnabled: jest.fn(),
}));
jest.mock('../../services/OnboardingSessionService', () => ({
  ensureOnboardingSession: jest.fn(),
  getSessionForUser: jest.fn(),
  isUserOnboardingComplete: jest.fn(),
  syncOnboardingConversation: jest.fn(),
}));
jest.mock('../../services/OnboardingMessagingService', () => ({
  loadMessaging: jest.fn(),
}));

describe('validateCodeV2', () => {
  const user = { id: 'new-user' };
  const request = {
    installationId: 'installation',
    params: { authCode: 'test-code', locale: 'en', phoneNumber: 'test-phone' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    assertConversationOnboardingEnabled.mockResolvedValue(true);
    validateCodeWithUser.mockResolvedValue({ sessionToken: 'session', user });
    getSessionForUser.mockResolvedValue(undefined);
    isUserOnboardingComplete.mockReturnValue(false);
    ensureOnboardingSession.mockResolvedValue({ id: 'onboarding-session' });
    syncOnboardingConversation.mockResolvedValue({
      completed: false,
      conversationId: 'conversation',
      guideSource: 'maya',
      guideUserId: 'maya-user',
      messagingRevision: 4,
      onboardingSessionId: 'onboarding-session',
      reachedStep: 'name',
      turns: [{ clientMessageId: 'onboarding:v1:welcome' }],
    });
  });

  test('provisions the canonical conversation after verification', async () => {
    await expect(validateCodeV2(request)).resolves.toEqual({
      completed: false,
      conversationId: 'conversation',
      existingUser: false,
      guideSource: 'maya',
      guideUserId: 'maya-user',
      messagingRevision: 4,
      onboardingSessionId: 'onboarding-session',
      reachedStep: 'name',
      sessionToken: 'session',
    });
    expect(ensureOnboardingSession).toHaveBeenCalledWith(user, request.params);
    expect(syncOnboardingConversation).toHaveBeenCalledWith(user, request.params);
  });

  test('does not mutate completed legacy users', async () => {
    isUserOnboardingComplete.mockReturnValue(true);
    loadMessaging.mockResolvedValue({ revision: 9 });

    await expect(validateCodeV2(request)).resolves.toEqual({
      completed: true,
      existingUser: true,
      messagingRevision: 9,
      reachedStep: 'completed',
      sessionToken: 'session',
    });
    expect(ensureOnboardingSession).not.toHaveBeenCalled();
    expect(syncOnboardingConversation).not.toHaveBeenCalled();
  });
});
