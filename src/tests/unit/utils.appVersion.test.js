import {
  assertMinimumAppVersion,
  compareSemanticVersions,
  getRequestAppVersion,
  parseSemanticVersion,
} from '../../utils/appVersion';

describe('messaging app version gate', () => {
  const originalMinimum = process.env.PARSE_MESSAGING_MINIMUM_APP_VERSION;

  afterEach(() => {
    if (originalMinimum === undefined) {
      delete process.env.PARSE_MESSAGING_MINIMUM_APP_VERSION;
    } else {
      process.env.PARSE_MESSAGING_MINIMUM_APP_VERSION = originalMinimum;
    }
  });

  test('parses stable and prerelease semantic versions', () => {
    expect(parseSemanticVersion('v2.3.4')).toEqual({
      core: [2, 3, 4],
      prerelease: [],
    });
    expect(parseSemanticVersion('2.3.4-beta.2+42')).toEqual({
      core: [2, 3, 4],
      prerelease: ['beta', 2],
    });
    expect(parseSemanticVersion('2.3')).toBeUndefined();
  });

  test('compares core and prerelease versions using semantic ordering', () => {
    expect(compareSemanticVersions('2.0.0', '1.9.9')).toBe(1);
    expect(compareSemanticVersions('2.0.0-beta.2', '2.0.0-beta.10')).toBe(-1);
    expect(compareSemanticVersions('2.0.0', '2.0.0-rc.1')).toBe(1);
    expect(compareSemanticVersions('2.0.0+5', '2.0.0+4')).toBe(0);
  });

  test('reads the app version header case-insensitively', () => {
    expect(
      getRequestAppVersion({ headers: { 'X-Jibber-App-Version': '2.1.0' } }),
    ).toBe('2.1.0');
  });

  test('allows exact/newer clients and trusted master writes', () => {
    process.env.PARSE_MESSAGING_MINIMUM_APP_VERSION = '2.1.0';
    expect(() =>
      assertMinimumAppVersion({
        headers: { 'x-jibber-app-version': '2.1.0' },
      }),
    ).not.toThrow();
    expect(() =>
      assertMinimumAppVersion({
        headers: { 'x-jibber-app-version': '3.0.0' },
      }),
    ).not.toThrow();
    expect(() => assertMinimumAppVersion({ master: true })).not.toThrow();
  });

  test('rejects missing, malformed, and outdated client versions', () => {
    process.env.PARSE_MESSAGING_MINIMUM_APP_VERSION = '2.1.0';
    expect(() => assertMinimumAppVersion({ headers: {} })).toThrow(
      'X-Jibber-App-Version 2.1.0 or newer is required',
    );
    expect(() =>
      assertMinimumAppVersion({
        headers: { 'x-jibber-app-version': 'not-a-version' },
      }),
    ).toThrow('X-Jibber-App-Version 2.1.0 or newer is required');
    expect(() =>
      assertMinimumAppVersion({
        headers: { 'x-jibber-app-version': '2.0.9' },
      }),
    ).toThrow('Jibber 2.1.0 or newer is required');
  });
});

