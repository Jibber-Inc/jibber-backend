import ExtendableError from 'extendable-error-class';


export class CreateHandleError extends ExtendableError {}


/**
 * Remove whitespace from string
 * @param {String} str
 * @returns {String}
 */
const stripWhitespace = str => str.replace(/\s+/g, '');


/**
 * HANDLE is the user friendly address for users in a conversation
 * handle = givenName + last initial + _ + reservation position
 * @param {String} givenName
 * @param {String} familyName
 * @param {Number} position
 */
const createHandle = (givenName, familyName, position) => {
  if (!givenName || typeof givenName !== 'string') {
    throw new CreateHandleError('[s4j9fgYe] Invalid arg givenName');
  }
  if (!familyName || typeof familyName !== 'string') {
    throw new CreateHandleError('[r67Qe8j4] Invalid arg familyName');
  }

  return `${
    stripWhitespace(givenName).toLowerCase()
  }${
    familyName.charAt(0).toLowerCase()
  }-${
    stripWhitespace(String(position))
  }`;
};


export default createHandle;
