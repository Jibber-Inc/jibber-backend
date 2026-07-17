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
    };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('creates a bot-owned reservation ready for manual sharing', async () => {
    const inviter = new Parse.User();
    const query = { get: jest.fn().mockResolvedValue(inviter) };
    Parse.Query.mockImplementation(() => query);

    const reservation = {
      id: 'reservation-id',
      save: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
    };
    ReservationService.createReservation.mockResolvedValue(reservation);

    await expect(
      StagingAppClipInviteService.create('+12065550123'),
    ).resolves.toEqual({
      deliveryMode: 'manual',
      inviteUrl:
        'https://jibber.wtf/reservation?reservationId=reservation-id',
      reservationId: 'reservation-id',
    });

    expect(ReservationService.createReservation).toHaveBeenCalledWith(inviter);
    expect(reservation.set).toHaveBeenCalledWith(
      'recipientPhoneLast4',
      '0123',
    );
    expect(reservation.set).toHaveBeenCalledWith(
      'inviteDeliveryStatus',
      'ready_to_share',
    );
  });

  it('does not require a phone number to create a shareable invite', async () => {
    const inviter = new Parse.User();
    const query = { get: jest.fn().mockResolvedValue(inviter) };
    Parse.Query.mockImplementation(() => query);

    const reservation = {
      id: 'reservation-id',
      save: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
    };
    ReservationService.createReservation.mockResolvedValue(reservation);

    await expect(StagingAppClipInviteService.create()).resolves.toEqual(
      expect.objectContaining({ deliveryMode: 'manual' }),
    );

    expect(reservation.set).not.toHaveBeenCalledWith(
      'recipientPhoneLast4',
      expect.anything(),
    );
  });

  it('rejects a non-E.164 recipient before creating a reservation', async () => {
    await expect(
      StagingAppClipInviteService.create('206-555-0123'),
    ).rejects.toThrow('E.164');
    expect(ReservationService.createReservation).not.toHaveBeenCalled();
  });

  it('requires a configured inviter bot', async () => {
    delete process.env.APP_CLIP_INVITER_BOT_USER_ID;

    await expect(StagingAppClipInviteService.create()).rejects.toThrow(
      'inviter bot is not configured',
    );
    expect(ReservationService.createReservation).not.toHaveBeenCalled();
  });
});
