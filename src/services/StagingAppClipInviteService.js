import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import ReservationService from './ReservationService';

const PRELUDE_NOTIFY_URL = 'https://api.prelude.dev/v2/notify';
const DEFAULT_INVITE_BASE_URL = 'https://jibber.wtf';
const masterOptions = { useMasterKey: true };

export class StagingAppClipInviteServiceError extends ExtendableError {}

const getConfig = () => ({
  botUserId: process.env.APP_CLIP_INVITER_BOT_USER_ID,
  enabled: process.env.APP_CLIP_INVITE_SMS_ENABLED === 'true',
  inviteBaseUrl:
    process.env.APP_CLIP_INVITE_BASE_URL || DEFAULT_INVITE_BASE_URL,
  preludeApiToken: process.env.PRELUDE_API_TOKEN,
  templateId: process.env.APP_CLIP_INVITE_TEMPLATE_ID,
});

const validatePhoneNumber = phoneNumber => {
  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber || '')) {
    throw new StagingAppClipInviteServiceError(
      'recipientPhoneNumber must use E.164 format',
    );
  }
};

const assertConfigured = config => {
  if (!config.enabled) {
    throw new StagingAppClipInviteServiceError(
      'Staging App Clip invitation SMS is disabled.',
    );
  }
  if (!config.botUserId || !config.preludeApiToken || !config.templateId) {
    throw new StagingAppClipInviteServiceError(
      'Staging App Clip invitation SMS is not fully configured.',
    );
  }
};

const send = async (recipientPhoneNumber, requestFetch = fetch) => {
  validatePhoneNumber(recipientPhoneNumber);
  const config = getConfig();
  assertConfigured(config);

  const inviter = await new Parse.Query(Parse.User).get(
    config.botUserId,
    masterOptions,
  );
  const reservation = await ReservationService.createReservation(inviter);
  const inviteUrl = `${config.inviteBaseUrl}/reservation?reservationId=${reservation.id}`;

  reservation.set('link', inviteUrl);
  reservation.set('recipientPhoneLast4', recipientPhoneNumber.slice(-4));
  reservation.set('inviteDeliveryStatus', 'submitting');
  await reservation.save(null, masterOptions);

  try {
    const response = await requestFetch(PRELUDE_NOTIFY_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${config.preludeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        correlation_id: `reservation-${reservation.id}`,
        preferred_channel: 'sms',
        template_id: config.templateId,
        to: recipientPhoneNumber,
        variables: {
          invite_url: inviteUrl,
          inviter_name: `${inviter.get('givenName') || ''} ${
            inviter.get('familyName') || ''
          }`.trim(),
        },
      }),
    });
    const body = await response.json();

    if (!response.ok || !body.id) {
      const message =
        (body && (body.message || body.code)) ||
        `Prelude Notify failed with status ${response.status}`;
      throw new Error(message);
    }

    reservation.set('inviteDeliveryStatus', 'submitted');
    reservation.set('inviteMessageId', body.id);
    reservation.set('inviteSentAt', new Date());
    await reservation.save(null, masterOptions);

    return {
      inviteMessageId: body.id,
      inviteUrl,
      reservationId: reservation.id,
    };
  } catch (error) {
    reservation.set('inviteDeliveryStatus', 'failed');
    reservation.set('inviteDeliveryError', error.message.slice(0, 240));
    await reservation.save(null, masterOptions);
    throw new StagingAppClipInviteServiceError(error.message);
  }
};

export default {
  getConfig,
  send,
};
