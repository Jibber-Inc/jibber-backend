import Twilio from '../../providers/TwilioProvider';
import ExtendableError from 'extendable-error-class';


class TwilioTestCredentialsError extends ExtendableError {}


/**
 * Confirm that the twilio client is using test credentials
 * https://www.Twilio.client.com/docs/iam/test-credentials
 */
const checkTwilioTestCredentials = async () => {

  process.stdout.write('\n\nValidating Twilio test creds...');

  const twilio = new Twilio();

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

  return twilio.client.messages
    .create({
      to: TO.valid,
      from: FROM.valid,
      body: 'test1',
    })
    .then(response => {
      process.stdout.write('.');
      if (!!response.price) {
        throw new TwilioTestCredentialsError(
          '😱 Test message returned value in response.price. Killing test run.'
        );
      }
    })

    .then(() => {
      process.stdout.write('.');
      return twilio.client.messages  // Try sending message *to* magic invalid number
        .create({
          to: TO.invalid,
          from: FROM.valid,
          body: 'test2',
        });
    })

    .then(() => {
      process.stdout.write('.');
      return twilio.client.messages  // Try sending message *from* magic invalid number
        .create({
          to: TO.valid,
          from: FROM.invalid,
          body: 'test3',
        });
    })
    .then(() => {
      throw new TwilioTestCredentialsError(
        '❌ The last promise should never have resolved.'
      );
    })
    .catch(error => {
      if (error.code === 21211) {
        process.stdout.write('👍 Twilio is using test credentials.\n');
        return; // expected from test2 and test3
      }
      if (error.code === 21606) {
        throw new TwilioTestCredentialsError(
          '❌ Do not use production credentials in test env. Killing test run.'
        );
      }
      throw error;
    });
};


export default checkTwilioTestCredentials;
