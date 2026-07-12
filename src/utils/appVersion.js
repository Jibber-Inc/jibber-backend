const VERSION_HEADER = 'x-jibber-app-version';

const parseIdentifier = identifier =>
  /^\d+$/.test(identifier) ? Number(identifier) : identifier;

export const parseSemanticVersion = value => {
  if (typeof value !== 'string') return undefined;
  const match = value.trim().match(
    /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/,
  );
  if (!match) return undefined;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ? match[4].split('.').map(parseIdentifier) : [],
  };
};

const comparePrerelease = (left, right) => {
  if (!left.length && !right.length) return 0;
  if (!left.length) return 1;
  if (!right.length) return -1;

  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] === undefined) return -1;
    if (right[index] === undefined) return 1;
    if (left[index] !== right[index]) {
      const leftIsNumber = typeof left[index] === 'number';
      const rightIsNumber = typeof right[index] === 'number';
      if (leftIsNumber && !rightIsNumber) return -1;
      if (!leftIsNumber && rightIsNumber) return 1;
      return left[index] > right[index] ? 1 : -1;
    }
  }
  return 0;
};

export const compareSemanticVersions = (leftValue, rightValue) => {
  const left = parseSemanticVersion(leftValue);
  const right = parseSemanticVersion(rightValue);
  if (!left || !right) throw new Error('A valid semantic version is required.');

  for (let index = 0; index < left.core.length; index += 1) {
    if (left.core[index] !== right.core[index]) {
      return left.core[index] > right.core[index] ? 1 : -1;
    }
  }
  return comparePrerelease(left.prerelease, right.prerelease);
};

export const getRequestAppVersion = request => {
  const headers = (request && request.headers) || {};
  if (typeof headers.get === 'function') {
    return headers.get(VERSION_HEADER) || headers.get('X-Jibber-App-Version');
  }
  const matchingKey = Object.keys(headers).find(
    key => key.toLowerCase() === VERSION_HEADER,
  );
  return matchingKey ? headers[matchingKey] : undefined;
};

export const assertMinimumAppVersion = request => {
  if (request && request.master) return;
  const minimumVersion = process.env.PARSE_MESSAGING_MINIMUM_APP_VERSION;
  if (!minimumVersion) return;
  if (!parseSemanticVersion(minimumVersion)) {
    throw new Error('PARSE_MESSAGING_MINIMUM_APP_VERSION must be semantic.');
  }

  const requestVersion = getRequestAppVersion(request);
  if (!requestVersion || !parseSemanticVersion(requestVersion)) {
    throw new Error(
      `X-Jibber-App-Version ${minimumVersion} or newer is required for messaging writes.`,
    );
  }
  if (compareSemanticVersions(requestVersion, minimumVersion) < 0) {
    throw new Error(
      `Jibber ${minimumVersion} or newer is required for messaging writes.`,
    );
  }
};

export default {
  assertMinimumAppVersion,
  compareSemanticVersions,
  getRequestAppVersion,
  parseSemanticVersion,
};
