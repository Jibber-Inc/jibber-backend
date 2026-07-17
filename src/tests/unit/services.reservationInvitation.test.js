import ReservationService from '../../services/ReservationService';
import Parse from '../../providers/ParseProvider';

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

jest.mock('../../services/ChatService', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../services/ConnectionService', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../services/PushService', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../utils/userData', () => ({
  __esModule: true,
  default: {
    getFullName: jest.fn(() => 'Jules Park'),
  },
}));

const makeQuery = reservation => ({
  get: jest.fn().mockResolvedValue(reservation),
  include: jest.fn().mockReturnThis(),
});

describe('ReservationService invitation responses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records an explicit decline without claiming the invitation', async () => {
    const fields = new Map([
      ['isClaimed', false],
      ['status', 'pending'],
    ]);
    const reservation = {
      id: 'reservation-id',
      get: jest.fn(key => fields.get(key)),
      save: jest.fn().mockResolvedValue(undefined),
      set: jest.fn((key, value) => fields.set(key, value)),
    };
    Parse.Query.mockImplementation(() => makeQuery(reservation));

    await expect(
      ReservationService.respondToInvitation('reservation-id', 'declined'),
    ).resolves.toEqual({
      decision: 'declined',
      reservationId: 'reservation-id',
    });

    expect(reservation.set).toHaveBeenCalledWith('status', 'declined');
    expect(reservation.set).toHaveBeenCalledWith(
      'respondedAt',
      expect.any(Date),
    );
    expect(reservation.set).not.toHaveBeenCalledWith('isClaimed', true);
  });

  it('does not allow a declined invitation to be accepted later', async () => {
    const reservation = {
      id: 'reservation-id',
      get: jest.fn(key =>
        key === 'isClaimed' ? false : 'declined',
      ),
    };
    Parse.Query.mockImplementation(() => makeQuery(reservation));

    await expect(
      ReservationService.respondToInvitation('reservation-id', 'accepted'),
    ).rejects.toThrow('already been declined');
  });
});
