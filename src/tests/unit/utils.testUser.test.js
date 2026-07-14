import testUser from '../../utils/testUser';

const stagingRequest = {
  headers: {
    'x-parse-application-id': 'hePp5QCoCdRygkKOmIGqyporjgo2LIrdhMuf687m',
  },
};

const productionRequest = {
  headers: {
    'x-parse-application-id': '4qvd8tYEda8zwXGWXSXcRzyQ4EShmqvdJLDJznsD',
  },
};

describe('staging dummy user', () => {
  test('is recognized only by the staging app', () => {
    expect(testUser.isTestUser('+12025550142', stagingRequest)).toBe(true);
    expect(testUser.isTestUser('+12025550142', productionRequest)).toBe(false);
  });

  test('accepts only the staging verification code', () => {
    expect(testUser.validate('4242', '+12025550142', stagingRequest)).toBe(
      'approved',
    );
    expect(testUser.validate('1111', '+12025550142', stagingRequest)).toBe(
      'pending',
    );
  });
});
