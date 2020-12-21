import ExtendableError from 'extendable-error-class';

import generateHandle from '../utils/generateHandle';

class CreateHandleCloudError extends ExtendableError {}

/**
 * Note: this endpoint should be unneccessary or only used as a backup in case
 * the "userBeforeSave" webhook fails to set the handle.
 * @returns {String}
 */
const createHandle = (request) => {
  const { givenName } = request.params;
  const { familyName } = request.params;
  const { position } = request.params;

  if (!givenName || typeof givenName !== 'string') {
    throw new CreateHandleCloudError(
      '[z0Enn6c2] "givenName" in request body is invalid, expected string',
    );
  }

  if (!familyName || typeof familyName !== 'string') {
    throw new CreateHandleCloudError(
      '[2UaA/dx7] "familyName" in request body is invalid, expected string',
    );
  }

  if (typeof position !== 'number') {
    throw new CreateHandleCloudError(
      '[Pin00mDK] "position" in request body is invalid, expected number',
    );
  }

  return generateHandle(givenName, familyName, position);
};

export default createHandle;
