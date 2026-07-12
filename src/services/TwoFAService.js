import ExtendableError from 'extendable-error-class';
import axios from 'axios';

const PRELUDE_API_URL = 'https://api.prelude.dev/v2/verification';

export class TwoFAServiceError extends ExtendableError {}

/**
 * Send auth code to a Parse.User phonenumber
 *
 * @param {Parse.User} user
 * @return {Promise}
 */
const sendCode = async phoneNumber => {
  if (!phoneNumber) {
    throw new TwoFAServiceError(
      '[qV6Heiv8] Cannot initiate 2FA, no phoneNumber provided',
    );
  }
  try {
    const { PRELUDE_API_TOKEN } = process.env;
    if (!PRELUDE_API_TOKEN) {
      throw new TwoFAServiceError(
        '[n7NrYcXq] PRELUDE_API_TOKEN environment variable is required',
      );
    }

    const response = await axios.post(
      PRELUDE_API_URL,
      {
        target: { type: 'phone_number', value: phoneNumber },
      },
      {
        headers: { Authorization: `Bearer ${PRELUDE_API_TOKEN}` },
      },
    );

    const acceptedStatuses = ['success', 'retry', 'shadow_blocked'];
    if (!acceptedStatuses.includes(response.data.status)) {
      throw new TwoFAServiceError(
        `[4Y2HqkTa] Verification ${response.data.status || 'failed'}`,
      );
    }

    return { ...response.data, status: 'pending' };
  } catch (error) {
    if (error instanceof TwoFAServiceError) {
      throw error;
    }
    throw new TwoFAServiceError(`[K67TCo5] ${error.message}`);
  }
};

const verifyCode = async (phonenumber, code) => {
  if (!code) {
    throw new TwoFAServiceError('[w396HBSy] No code provided');
  }
  try {
    const { PRELUDE_API_TOKEN } = process.env;
    if (!PRELUDE_API_TOKEN) {
      throw new TwoFAServiceError(
        '[n7NrYcXq] PRELUDE_API_TOKEN environment variable is required',
      );
    }

    const response = await axios.post(
      `${PRELUDE_API_URL}/check`,
      {
        target: { type: 'phone_number', value: phonenumber },
        code,
      },
      {
        headers: { Authorization: `Bearer ${PRELUDE_API_TOKEN}` },
      },
    );

    return {
      ...response.data,
      status: response.data.status === 'success' ? 'approved' : 'pending',
    };
  } catch (error) {
    if (error instanceof TwoFAServiceError) {
      throw error;
    }
    throw new TwoFAServiceError(`[j816CRx9] ${error.message}`);
  }
};

export default { sendCode, verifyCode };
