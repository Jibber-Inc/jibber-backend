import validateCode from '../../cloud/validateCode';
import Parse from '../../providers/ParseProvider';
import TwoFAService from '../../services/TwoFAService';
import UserService from '../../services/UserService';
import ReservationService from '../../services/ReservationService';
import testUser from '../../utils/testUser';

jest.mock('../../providers/ParseProvider', () => {
  class User {}
  User.logIn = jest.fn();

  return {
    __esModule: true,
    default: {
      Query: jest.fn(),
      User,
    },
  };
});

jest.mock('../../utils/generatePassword', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../services/TwoFAService', () => ({
  __esModule: true,
  default: {
    verifyCode: jest.fn(),
  },
}));

jest.mock('../../services/UserService', () => ({
  __esModule: true,
  default: {
    getLastSessionToken: jest.fn(),
  },
}));

jest.mock('../../services/ReservationService', () => ({
  __esModule: true,
  default: {
    createReservations: jest.fn(),
    hasReservations: jest.fn(),
  },
}));

jest.mock('../../utils/testUser', () => ({
  __esModule: true,
  default: {
    isTestUser: jest.fn(),
    validate: jest.fn(),
  },
}));

const phoneNumber = '+12065550123';
const request = {
  installationId: 'installation-id',
  params: {
    authCode: '1234',
    phoneNumber,
  },
};

const makeUser = overrides => {
  const fields = new Map([
    ['hashcode', 'hashcode'],
    ['phoneNumber', phoneNumber],
    ['smsVerificationStatus', 'approved'],
    ['status', 'active'],
    ...Object.entries(overrides || {}),
  ]);
  const user = new Parse.User();
  user.get = jest.fn(key => fields.get(key));
  user.set = jest.fn((key, value) => fields.set(key, value));
  user.save = jest.fn().mockResolvedValue(user);
  user.getUsername = jest.fn().mockReturnValue('username');
  return user;
};

const setQueryResult = user => {
  const query = {
    equalTo: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(user),
  };
  Parse.Query.mockImplementation(() => query);
  return query;
};

describe('validateCode reservation allocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserService.getLastSessionToken.mockResolvedValue('session-token');
    ReservationService.hasReservations.mockResolvedValue(false);
    ReservationService.createReservations.mockResolvedValue([]);
    testUser.isTestUser.mockReturnValue(false);
    TwoFAService.verifyCode.mockResolvedValue({ status: 'approved' });
  });

  it('repairs an already-approved user and waits for reservation creation', async () => {
    const user = makeUser();
    setQueryResult(user);

    let resolveCreation;
    let signalCreationStarted;
    const creationStarted = new Promise(resolve => {
      signalCreationStarted = resolve;
    });
    ReservationService.createReservations.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCreation = resolve;
          signalCreationStarted();
        }),
    );

    const result = validateCode(request);
    await creationStarted;

    expect(ReservationService.createReservations).toHaveBeenCalledWith(user, 9);
    expect(UserService.getLastSessionToken).not.toHaveBeenCalled();

    resolveCreation([]);

    await expect(result).resolves.toBe('session-token');
    expect(UserService.getLastSessionToken).toHaveBeenCalledWith(
      user,
      request.installationId,
    );
  });

  it('allocates reservations when a new user becomes approved', async () => {
    const user = makeUser({ smsVerificationStatus: 'pending' });
    setQueryResult(user);

    await expect(validateCode(request)).resolves.toBe('session-token');

    expect(TwoFAService.verifyCode).toHaveBeenCalledWith(phoneNumber, '1234');
    expect(user.save).toHaveBeenCalledWith(null, { useMasterKey: true });
    expect(ReservationService.createReservations).toHaveBeenCalledWith(user, 9);
  });

  it('does not duplicate an existing reservation allocation', async () => {
    const user = makeUser();
    setQueryResult(user);
    ReservationService.hasReservations.mockResolvedValue(true);

    await expect(validateCode(request)).resolves.toBe('session-token');

    expect(ReservationService.createReservations).not.toHaveBeenCalled();
  });
});
