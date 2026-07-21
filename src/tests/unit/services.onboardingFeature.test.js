const mockGet = jest.fn();

jest.mock('../../providers/ParseProvider', () => ({
  __esModule: true,
  default: {
    Config: {
      get: jest.fn(() => Promise.resolve({ get: mockGet })),
    },
  },
}));

const {
  assertConversationOnboardingEnabled,
} = require('../../services/OnboardingFeatureService');

describe('Conversation onboarding feature policy', () => {
  beforeEach(() => mockGet.mockReset());

  test('matches the native client by accepting only boolean true', async () => {
    mockGet.mockReturnValue(true);
    await expect(
      assertConversationOnboardingEnabled({}),
    ).resolves.toBe(true);

    for (const disabledValue of [false, 'true', 1, { enabled: true }]) {
      mockGet.mockReturnValue(disabledValue);
      // eslint-disable-next-line no-await-in-loop
      await expect(
        assertConversationOnboardingEnabled({}),
      ).rejects.toThrow('not enabled');
    }
  });

  test('allows trusted maintenance calls without a feature lookup', async () => {
    await expect(
      assertConversationOnboardingEnabled({ master: true }),
    ).resolves.toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
