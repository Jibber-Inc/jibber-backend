// Load Environment Variables
const { TEST_USER_PHONE_NUMBER, TEST_USER_VERIFICATION_CODE } = process.env;

// This persona is intentionally available only in the isolated staging Parse
// app. The number is in the NANP fictional-use range, so no real subscriber
// can receive a verification message for it.
const STAGING_APPLICATION_ID = 'hePp5QCoCdRygkKOmIGqyporjgo2LIrdhMuf687m';
const STAGING_DUMMY_PHONE_NUMBER = '+12025550142';
const STAGING_DUMMY_VERIFICATION_CODE = '4242';

const getRequestApplicationId = request => {
  const headers = request && request.headers;
  return (
    (headers &&
      (headers['x-parse-application-id'] ||
        headers['X-Parse-Application-Id'])) ||
    process.env.APP_ID ||
    process.env.PARSE_SERVER_APPLICATION_ID
  );
};

const isStagingDummyUser = (phoneNumber, request) =>
  phoneNumber === STAGING_DUMMY_PHONE_NUMBER &&
  getRequestApplicationId(request) === STAGING_APPLICATION_ID;

/**
 * Checks if the phone number belongs to the Test User
 *
 * @param {*} phoneNumber
 */
const isTestUser = (phoneNumber, request) =>
  isStagingDummyUser(phoneNumber, request) ||
  Boolean(phoneNumber && phoneNumber === TEST_USER_PHONE_NUMBER);

const validate = (code, phoneNumber, request) =>
  (isStagingDummyUser(phoneNumber, request) &&
    code === STAGING_DUMMY_VERIFICATION_CODE) ||
  (phoneNumber === TEST_USER_PHONE_NUMBER &&
    code === TEST_USER_VERIFICATION_CODE)
    ? 'approved'
    : 'pending';

export default {
  isTestUser,
  validate,
};
