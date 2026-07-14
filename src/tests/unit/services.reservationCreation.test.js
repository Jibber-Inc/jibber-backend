import ReservationService from '../../services/ReservationService';
import Parse from '../../providers/ParseProvider';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'reservation-code'),
}));

jest.mock('../../providers/ParseProvider', () => {
  class User {}

  return {
    __esModule: true,
    default: {
      Object: jest.fn(),
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
  default: {},
}));

describe('ReservationService creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets every field required by the live Reservation schema', async () => {
    const user = new Parse.User();
    const reservation = {
      save: jest.fn().mockResolvedValue('saved-reservation'),
      set: jest.fn(),
    };
    Parse.Object.mockImplementation(() => reservation);

    await expect(
      ReservationService.createReservation(user),
    ).resolves.toBe('saved-reservation');

    expect(Parse.Object).toHaveBeenCalledWith('Reservation');
    expect(reservation.set).toHaveBeenCalledWith('isClaimed', false);
    expect(reservation.set).toHaveBeenCalledWith('createdBy', user);
    expect(reservation.set).toHaveBeenCalledWith(
      'position',
      expect.any(Number),
    );
    expect(reservation.set).toHaveBeenCalledWith('code', 'reservation-code');
    expect(reservation.save).toHaveBeenCalledWith(null, {
      useMasterKey: true,
    });
  });
});
