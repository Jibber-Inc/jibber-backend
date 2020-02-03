/**
 * Return only numbers
 * @param {String} phoneNumber
 */
const stripPhoneNumber = phoneNumber => {
  return phoneNumber.replace(/\D/g, '');
};


export default stripPhoneNumber;
