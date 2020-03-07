import ExtendableError from 'extendable-error-class';

import _createHandle from '../utils/createHandle';


class CreateHandleCloudError extends ExtendableError {}


/**
 * Note: this endpoint should be unneccessary or only used as a backup in case
 * the "userBeforeSave" webhook fails to set the handle.
 * @returns {String}
 */
const createHandle = request => {
  let givenName = request.params.givenName;
  let familyName = request.params.familyName;
  let position = request.params.position;

  if (!givenName || typeof givenName !== 'string') {
    throw new CreateHandleCloudError(
      '[z0Enn6c2] "givenName" in request body is invalid, expected string'
    );
  }

  if (!familyName || typeof familyName !== 'string') {
    throw new CreateHandleCloudError(
      '[2UaA/dx7] "familyName" in request body is invalid, expected string'
    );
  }

  if (typeof position !== 'number') {
    throw new CreateHandleCloudError(
      '[Pin00mDK] "position" in request body is invalid, expected number'
    );
  }

  return _createHandle(givenName, familyName, position);
};


export default createHandle;
