jest.mock('axios', () => ({
  post: jest.fn(),
}));

const axios = require('axios');
const TwoFAServiceModule = require('../../services/TwoFAService');
const TwoFAService = TwoFAServiceModule.default;
const { TwoFAServiceError } = TwoFAServiceModule;

describe('TwoFAService Prelude verification', () => {
  beforeEach(() => {
    axios.post.mockReset();
    process.env.PRELUDE_API_TOKEN = 'prelude-test-token';
  });

  afterAll(() => {
    delete process.env.PRELUDE_API_TOKEN;
  });

  test('sends a phone verification without exposing provider state', async () => {
    axios.post.mockResolvedValue({
      data: { id: 'vrf_123', status: 'success', channels: ['sms'] },
    });

    await expect(TwoFAService.sendCode('+12065550123')).resolves.toEqual(
      expect.objectContaining({ id: 'vrf_123', status: 'pending' }),
    );
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.prelude.dev/v2/verification',
      { target: { type: 'phone_number', value: '+12065550123' } },
      { headers: { Authorization: 'Bearer prelude-test-token' } },
    );
  });

  test('rejects provider-blocked verification attempts', async () => {
    axios.post.mockResolvedValue({
      data: { status: 'blocked', reason: 'repeated_attempts' },
    });

    await expect(TwoFAService.sendCode('+12065550123')).rejects.toThrow(
      TwoFAServiceError,
    );
  });

  test.each([
    ['success', 'approved'],
    ['failure', 'pending'],
    ['expired_or_not_found', 'pending'],
  ])('maps check status %s to %s', async (providerStatus, status) => {
    axios.post.mockResolvedValue({ data: { status: providerStatus } });

    await expect(
      TwoFAService.verifyCode('+12065550123', '123456'),
    ).resolves.toEqual(expect.objectContaining({ status }));
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.prelude.dev/v2/verification/check',
      {
        target: { type: 'phone_number', value: '+12065550123' },
        code: '123456',
      },
      { headers: { Authorization: 'Bearer prelude-test-token' } },
    );
  });

  test('requires a Prelude API token', async () => {
    delete process.env.PRELUDE_API_TOKEN;

    await expect(TwoFAService.sendCode('+12065550123')).rejects.toThrow(
      'PRELUDE_API_TOKEN environment variable is required',
    );
  });
});
