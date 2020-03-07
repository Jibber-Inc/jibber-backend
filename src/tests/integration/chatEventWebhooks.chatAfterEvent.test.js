import axios from 'axios';
const webhooks = require('twilio/lib/webhooks/webhooks');



/**
 * Post-Event Webhook tests
 */
describe('test twilio post event webhook endpoints', () => {

  const {
    TWILIO_AUTH_TOKEN,
    TWILIO_ACCOUNT_SID,
  } = process.env;

  const url = `${process.env.HOST}:${process.env.PORT}/chatAfterEvent`;

  /** case: valid requests */
  test.each([
    'onChannelAdded',
    'onChannelDestroyed',
    'onChannelUpdated',
    'onMediaMessageSent',
    'onMemberAdded',
    'onMemberRemoved',
    'onMemberUpdated',
    'onMessageRemoved',
    'onMessageSent',
    'onMessageUpdated',
    'onUserAdded',
    'onUserUpdated',
  ])(
    'should return 200 response status on EventType: %p',
    async EventType => {
      expect.assertions(1);

      const params = {
        AccountSid: TWILIO_ACCOUNT_SID,
        InstanceSid: '12345',
        ClientIdentity: '56789',
        EventType,
      };

      const signature = webhooks
        .getExpectedTwilioSignature(TWILIO_AUTH_TOKEN, url, params);

      const options = {
        headers: {
          'X-Twilio-Signature': signature,
        },
      };

      return axios
        .post(url, params, options)
        .then(response => expect(response.status).toBe(200));
    });


  /** case: missing twilio signature header */
  it('should return 400 if no X-Twilio-Signature header', async () => {
    expect.assertions(2);
    const params = {
      AccountSid: TWILIO_ACCOUNT_SID,
      InstanceSid: '12345',
      ClientIdentity: '56789',
      EventType: 'onChannelAdded',
    };
    return axios
      .post(url, params)
      .catch(error => {
        expect(error.response.status).toBe(400);
        expect(error.response.statusText).toBe('Bad Request');
      });
  });


  /** case: invalid twilio signature header */
  it('should return 403 if invalid X-Twilio-Signature header', async () => {
    expect.assertions(2);
    const params = {
      AccountSid: TWILIO_ACCOUNT_SID,
      InstanceSid: '12345',
      ClientIdentity: '56789',
      EventType: 'onChannelAdded',
    };
    const signature = webhooks
      .getExpectedTwilioSignature('NOT_TWILIO_AUTH_TOKEN', url, params);
    const options = {
      headers: {
        'X-Twilio-Signature': signature,
      },
    };
    return axios
      .post(url, params, options)
      .catch(error => {
        expect(error.response.status).toBe(403);
        expect(error.response.statusText).toBe('Forbidden');
      });
  });


  /** case: no matching handler found */
  it('should return 403 if no matching handler found for EventType', async () => {
    expect.assertions(2);
    const EventType = 'InvalidEventTypeName';
    const params = {
      AccountSid: TWILIO_ACCOUNT_SID,
      InstanceSid: '12345',
      ClientIdentity: '56789',
      EventType,
    };

    const signature = webhooks
      .getExpectedTwilioSignature(TWILIO_AUTH_TOKEN, url, params);

    const options = {
      headers: {
        'X-Twilio-Signature': signature,
      },
    };

    return axios
      .post(url, params, options)
      .catch(error => {
        expect(error.response.status).toBe(403);
        expect(error.response.data).toBe(`No handler found for ${EventType}`);
      });
  });

});
