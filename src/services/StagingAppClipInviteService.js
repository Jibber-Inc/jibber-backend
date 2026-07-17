import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import ReservationService from './ReservationService';

const DEFAULT_INVITE_BASE_URL = 'https://jibber.wtf';
const masterOptions = { useMasterKey: true };

export class StagingAppClipInviteServiceError extends ExtendableError {}

const getConfig = () => ({
  botUserId: process.env.APP_CLIP_INVITER_BOT_USER_ID,
  inviteBaseUrl:
    process.env.APP_CLIP_INVITE_BASE_URL || DEFAULT_INVITE_BASE_URL,
});

const validatePhoneNumber = phoneNumber => {
  if (!phoneNumber) {
    return;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber || '')) {
    throw new StagingAppClipInviteServiceError(
      'recipientPhoneNumber must use E.164 format',
    );
  }
};

const assertConfigured = config => {
  if (!config.botUserId) {
    throw new StagingAppClipInviteServiceError(
      'Staging App Clip inviter bot is not configured.',
    );
  }
};

const create = async recipientPhoneNumber => {
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
  if (recipientPhoneNumber) {
    reservation.set('recipientPhoneLast4', recipientPhoneNumber.slice(-4));
  }
  reservation.set('inviteDeliveryStatus', 'ready_to_share');
  await reservation.save(null, masterOptions);

  return {
    deliveryMode: 'manual',
    inviteUrl,
    reservationId: reservation.id,
  };
};

export default {
  create,
  getConfig,
};
