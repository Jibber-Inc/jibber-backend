import twilio from 'twilio';
import { ExtendableError } from '../../errors';


class TwilioTestCredentialsError extends ExtendableError {}


/**
 * Confirm that the twilio client is using test credentials
 * https://www.twilio.com/docs/iam/test-credentials
 */
const checkTwilioTestCredentials = async () => {

  console.log('\nValidating Twilio test creds...\n');

  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
  } = process.env;

  // Throw if required env vars are not declared
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new TwilioTestCredentialsError(
      'TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables are required.'
    );
  }

  const twilioClient = new twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  /**
   * Twilio magic testing numbers
   */
  const FROM = {
    invalid: '+15005550001', // expect error 21212
    valid: '+15005550006', // returns 400 if not using test credentials
    prod: '+12012560616',
  };
  const TO = {
    invalid: '+15005550001', // expect error 21211
    valid: '+16127779311',
  };

  return twilioClient.messages
    .create({
      to: TO.valid,
      from: FROM.valid,
      body: 'test1',
    })
    .then(response => {
      if (!!response.price) {
        throw new TwilioTestCredentialsError(
          '😱 Test message returned value in response.price. Killing test run.'
        );
      }
    })

    .then(() => twilioClient.messages  // Try sending message *to* magic invalid number
      .create({
        to: TO.invalid,
        from: FROM.valid,
        body: 'test2',
      }))

    .then(() => twilioClient.messages  // Try sending message *from* magic invalid number
      .create({
        to: TO.valid,
        from: FROM.invalid,
        body: 'test3',
      }))
    .then(() => {
      throw new TwilioTestCredentialsError(
        'The last promise should never have resolved.'
      );
    })
    .catch(error => {
      if (error.code === 21211) return; // expected from test2 and test3
      if (error.code === 21606) {
        throw new TwilioTestCredentialsError(
          '🤑 Do not use production credentials in test env. Killing test run.'
        );
      }
      throw error;
    });
};


export default checkTwilioTestCredentials;
