// Load Environment Variables
const { TEST_USER_PHONE_NUMBER, TEST_USER_VERIFICATION_CODE } = process.env;

/**
 * Checks if the phone number belongs to the Test User
 *
 * @param {*} phoneNumber
 */
const isTestUser = phoneNumber => {
  console.log('ENTRÓ POR USUARIO DE PRUEBA');
  if (phoneNumber && phoneNumber === TEST_USER_PHONE_NUMBER) {
    return true;
  }
  return false;
};

const validate = code => {
  if (code === TEST_USER_VERIFICATION_CODE) {
    return 'approved';
  }
  return 'pending';
};

export default {
  isTestUser,
  validate,
};
