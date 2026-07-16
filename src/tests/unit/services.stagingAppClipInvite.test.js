import Parse from '../../providers/ParseProvider';
import ReservationService from '../../services/ReservationService';
import StagingAppClipInviteService from '../../services/StagingAppClipInviteService';

jest.mock('../../providers/ParseProvider', () => {
  class User {}

  return {
    __esModule: true,
    default: {
      Query: jest.fn(),
      User,
    },
  };
});

jest.mock('../../services/ReservationService', () => ({
  __esModule: true,
  default: {
    createReservation: jest.fn(),
  },
}));

describe('StagingAppClipInviteService', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnvironment,
      APP_CLIP_INVITER_BOT_USER_ID: 'bot-user-id',
      APP_CLIP_INVITE_SMS_ENABLED: 'true',
      APP_CLIP_INVITE_TEMPLATE_ID: 'template-id',
      PRELUDE_API_TOKEN: 'prelude-token',
    };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('creates a bot-owned reservation and submits an auditable SMS', async () => {
    const inviter = new Parse.User();
    inviter.get = jest.fn(key =>
      key === 'givenName' ? 'Jules' : 'Park',
    );
    const query = { get: jest.fn().mockResolvedValue(inviter) };
    Parse.Query.mockImplementation(() => query);

    const reservation = {
      id: 'reservation-id',
      save: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
    };
    ReservationService.createReservation.mockResolvedValue(reservation);
    const requestFetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ id: 'notify-message-id' }),
      ok: true,
      status: 200,
    });

    await expect(
      StagingAppClipInviteService.send('+12065550123', requestFetch),
    ).resolves.toEqual({
      inviteMessageId: 'notify-message-id',
      inviteUrl:
        'https://jibber.wtf/reservation?reservationId=reservation-id',
      reservationId: 'reservation-id',
    });

    expect(ReservationService.createReservation).toHaveBeenCalledWith(inviter);
    expect(requestFetch).toHaveBeenCalledWith(
      'https://api.prelude.dev/v2/notify',
      expect.objectContaining({ method: 'POST' }),
    );
    const request = requestFetch.mock.calls[0][1];
    expect(JSON.parse(request.body)).toEqual({
      correlation_id: 'reservation-reservation-id',
      preferred_channel: 'sms',
      template_id: 'template-id',
      to: '+12065550123',
      variables: {
        invite_url:
          'https://jibber.wtf/reservation?reservationId=reservation-id',
        inviter_name: 'Jules Park',
      },
    });
    expect(reservation.set).toHaveBeenCalledWith(
      'recipientPhoneLast4',
      '0123',
    );
    expect(reservation.set).toHaveBeenCalledWith(
      'inviteDeliveryStatus',
      'submitted',
    );
  });

  it('rejects a non-E.164 recipient before creating a reservation', async () => {
    await expect(
      StagingAppClipInviteService.send('206-555-0123', jest.fn()),
    ).rejects.toThrow('E.164');
    expect(ReservationService.createReservation).not.toHaveBeenCalled();
  });
});
