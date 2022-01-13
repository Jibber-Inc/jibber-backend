import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import generatePassword from '../utils/generatePassword';
import TwoFAService from '../services/TwoFAService';
import UserService from '../services/UserService';
import UserUtils from '../utils/userData';
import ReservationService, {
  ReservationServiceError,
} from '../services/ReservationService';
// import QuePositionsService from '../services/QuePositionsService';
import ConnectionService from '../services/ConnectionService';
// Utils
import testUser from '../utils/testUser';
// import db from '../utils/db';
// Providers
import Stream from '../providers/StreamProvider';
import PushService from '../services/PushService';
import ChatService from '../services/ChatService';

class ValidateCodeError extends ExtendableError { }

const setReservations = async user => {
  const hasReservations = await ReservationService.hasReservations(user);
  if (!hasReservations) {
    // creates 3 reservations for the new user.
    // TODO: set this number as an app configuration.
    await ReservationService.createReservations(user, 3);
  }
};

// Users that come with a reservation has full access
// Users without a reservation are placed in a queue.
// Their position in the queue is set when they send the validation code
// The user status can be one of: active, inactive, waitlist
// If the position is higher than the max allowed position (maxQuePosition), they get the waitlist status
// Active: users that have full access to the application
// Inactive: users that have full access to the application, but they didnt end the onboarding yet
// Waitlist: users in the Waitlist have to wait until the maxQuePosition is increased, letting more users get full access.
const setUserStatus = async (user, reservation = null) => {
  // Get the needed que values to calculate the user status
  // const config = await Parse.Config.get({ useMasterKey: true });
  // get maxQuePosition from parse. This variable is manually set depending on the needs
  // const maxQuePosition = config.get('maxQuePosition');
  // get the last position of the queue + 1. For more information, check db import.
  // let currentQuePosition = user.get('quePosition');

  // if (!currentQuePosition) {
  //   currentQuePosition = await db.getValueForNextSequence('unclaimedPosition');

  //   await QuePositionsService.update('unclaimedPosition', currentQuePosition);
  // }

  if (user.get('status') && user.get('status') !== 'active') {
    if (reservation) {
      user.set('status', 'inactive');
    } else {
      // user.set('quePosition', currentQuePosition);
      // if (maxQuePosition >= currentQuePosition) {
      //   user.set('status', 'inactive');
      // } else {
      //   user.set('status', 'waitlist');
      // }
      user.set('status', 'waitlist');
    }
  }
};

const validateCode = async request => {
  const { params, installationId } = request;
  const { phoneNumber, authCode, reservationId, passId } = params;

  // Phone number is required in request body
  if (!phoneNumber) {
    throw new ValidateCodeError(
      '[JXK8SYA4] No phone number provided in request',
    );
  }

  // Installation Id is required in request body
  if (!installationId) {
    throw new ValidateCodeError(
      '[STK8SYR9] No installationId provided in request header',
    );
  }

  // Auth code is required in request body
  if (!authCode) {
    throw new ValidateCodeError('[xDETWSYH] No auth code provided in request');
  }

  // Retrieve the user with the phoneNumber
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('phoneNumber', phoneNumber);
  const user = await userQuery.first({ useMasterKey: true });

  if (!(user instanceof Parse.User)) {
    throw new ValidateCodeError('[zIslmc6c] User not found');
  }

  try {
    let conversationId;
    if (user.get('smsVerificationStatus') !== 'approved') {
      let status;
      if (testUser.isTestUser(phoneNumber)) {
        status = testUser.validate(authCode);
      } else {
        const result = await TwoFAService.verifyCode(
          user.get('phoneNumber'),
          authCode,
        );
        status = result.status;
      }

      // If the code is wrong, user won't be approved
      if (status !== 'approved') {
        throw new ValidateCodeError('[KTN1RYO9] Auth code validation failed');
      }

      if (reservationId) {
        const reservation = await ReservationService.claimReservation(reservationId, user);
        const conversationCid = reservation.get('conversationId');
        const conversation = await ChatService.getConversationByCid(
          conversationCid,
        );  
        
        const fromUser = await new Parse.Query(Parse.User).get(conversation.data.created_by.id);
        const fullName = UserUtils.getFullName(fromUser);
        const connection = await new Parse.Query('Connection').equalTo('channelSId', conversationCid).find({ useMasterKey: true });

        const connectionId = connection && connection.length && connection[0].id || null

        const data = {
          messageId: null,
          conversationCid,
          title: `${fullName} joined your conversation! 🥳`,
          body:  `${fullName} accepted your invitation and was added to your conversation.`,
          target: 'channel',
          category: 'connection.new',
          interruptionLevel: 'time-sensitive',
          threadId: conversationCid,
          author: fromUser.id,
          connectionId,
        };  

        await PushService.sendPushNotificationToUsers(
          data,
          [fromUser],
        );
      }

      if (passId) {
        const pass = await new Parse.Query('Pass').get(passId);
        const owner = pass.get('owner');
        const connection = await ConnectionService.createConnection(
          user,
          owner,
          'accepted',
        );
        const relation = pass.relation('connections');
        relation.add(connection);
        await pass.save(null, { useMasterKey: true });

        const members = [user.id, owner.id];
        conversationId = `pass_${user.id}_${owner.id}`;

        const conversationConfig = Stream.client.conversation(
          'messaging',
          conversationId,
          {
            name: '',
            description: '',
            members,
            created_by_id: user.id,
          },
        );

        await conversationConfig.create();

        user.set('status', 'inactive');
      } else {
        await setUserStatus(user, reservationId);
      }

      user.set('smsVerificationStatus', status);
      await user.save(null, { useMasterKey: true });

      setReservations(user);
    }

    const sessionToken = await UserService.getLastSessionToken(
      user,
      installationId,
    );
    // If no session token present login the user.
    if (!sessionToken) {
      const logged = await Parse.User.logIn(
        user.getUsername(),
        generatePassword(user.get('hashcode')),
        {
          installationId,
        },
      );
      return logged.getSessionToken();
    }

    return {
      sessionToken,
      conversationId,
    };
  } catch (error) {
    if (error instanceof ReservationServiceError) {
      setUserStatus(user);
      user.save(null, { useMasterKey: true });
      throw error;
    }
    throw new ValidateCodeError(`Validation error. Detail: ${error.message}`);
  }
};

export default validateCode;
