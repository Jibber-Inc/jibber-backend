import ExtendableError from 'extendable-error-class';

export class StripPhoneNumberError extends ExtendableError {}

/**
 * Return only numbers
 * @param {String} phoneNumber
 */
const stripPhoneNumber = phoneNumber => {
  // Enforce argument type
  if (typeof phoneNumber !== 'string') {
    throw new StripPhoneNumberError(
      `Phone number type should be string - got ${typeof phoneNumber}`,
    );
  }

  return phoneNumber.replace(/\D/g, '');
};

export default stripPhoneNumber;
