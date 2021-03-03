// Vendor
import hat from 'hat';
import uuidv4 from 'uuid/v4';
import ExtendableError from 'extendable-error-class';
// Providers
import Parse from '../providers/ParseProvider';
// Utils
import generatePassword from '../utils/generatePassword';
// Services
import QuePositionsService from './QuePositionsService';
import ChatService from './ChatService';
import FeedService from './FeedService';

class UserServiceError extends ExtendableError {}

/**
 * Create a new user.
 *
 * @param {String} phoneNumber
 * @param {String} authCode optional
 * @returns {Promise->Parse.User}
 */
const createUser = async (phoneNumber, installationId) => {
  // Phone number argument is required
  if (!phoneNumber) {
    throw new UserServiceError('[5qlkGfPY] Phone number is required');
  }

  const newUser = new Parse.User();
  newUser.setUsername(uuidv4());
  const hashcode = hat();
  newUser.setPassword(generatePassword(hashcode));

  const userAttributes = {
    phoneNumber,
    language: 'en',
    hashcode,
  };

  return Parse.User.signUp(
    newUser.get('username'),
    newUser.get('password'),
    userAttributes,
    {
      installationId,
      useMasterKey: true,
    },
  );
};

/**
 * Asign the 'USER' role to the given user
 *
 * @param {*} user
 */
const asignDefaultRole = async user => {
  try {
    const userRole = await new Parse.Query(Parse.Role)
      .equalTo('users', user)
      .first();
    if (!userRole) {
      const defaultRole = await new Parse.Query(Parse.Role)
        .equalTo('name', 'USER')
        .first();
      if (defaultRole) {
        defaultRole.getUsers().add(user);
        defaultRole.save(null, { useMasterKey: true });
      }
    }
    return user;
  } catch (error) {
    throw new UserServiceError(error.message);
  }
};

/**
 * Find last user session based on installation id.
 *
 * @param {Parse.User} user
 * @param {string} installationId
 */
const getLastSessionToken = async (user, installationId) => {
  const query = new Parse.Query(Parse.Session);
  query.equalTo('user', user);
  query.equalTo('installationId', installationId);
  query.descending('updatedAt');
  const session = await query.first({ useMasterKey: true });
  return session ? session.get('sessionToken') : undefined;
};

/**
 * Clear all user sessions
 *
 * @param {Parse.User} user
 */
const clearUserSessions = async user => {
  const query = new Parse.Query(Parse.Session);
  query.equalTo('user', user);
  const sessions = await query.find({ useMasterKey: true });
  const promises = sessions.map(session =>
    session.destroy({ useMasterKey: true }),
  );
  const sessionsCleared = await Promise.all(promises);
  return { sessions: sessionsCleared.map(s => s.get('sessionToken')) };
};

/**
 * Deletes all user installations instances
 *
 * @param {Parse.User} user
 */
const deleteUserInstallations = async user => {
  try {
    const query = new Parse.Query(Parse.Installation);
    query.equalTo('userId', user.id);
    const installations = await query.find({ useMasterKey: true });
    await Promise.all(
      installations.map(installation =>
        installation.destroy({ useMasterKey: true }),
      ),
    );
  } catch (error) {
    throw new UserServiceError(error.message);
  }
};

/**
 * Delete all user rituals.
 *
 * @param {Parse.User} user
 */
const deleteRituals = async user => {
  try {
    if (user.get('ritual')) {
      const ritual = await user.get('ritual').fetch();
      await ritual.destroy({ useMasterKey: true });
    }
  } catch (error) {
    throw new UserServiceError(error.message);
  }
};

/**
 * Delete all user connections
 *
 * @param {Parse.User} user
 */
const deleteConnections = async user => {
  try {
    const fromQuery = new Parse.Query('Connection').equalTo('from', user);
    const toQuery = new Parse.Query('Connection').equalTo('to', user);
    const mainQuery = Parse.Query.or(fromQuery, toQuery);
    const results = await mainQuery.find({ useMasterKey: true });
    if (results) {
      await Promise.all(
        results.map(conn => conn.destroy({ useMasterKey: true })),
      );
    }
  } catch (error) {
    throw new UserServiceError(error.message);
  }
};

/**
 * Delete all user reservations
 *
 * @param {Parse.User} user
 */
const deleteReservations = async user => {
  try {
    const query = new Parse.Query('Reservation').equalTo('createdBy', user);
    const results = await query.find({ useMasterKey: true });
    if (results) {
      await Promise.all(
        results.map(res => res.destroy({ useMasterKey: true })),
      );
    }
  } catch (error) {
    throw new UserServiceError(error.message);
  }
};

/**
 * Creates the handle for the user
 *
 * @param {*} user
 * @param {*} claimedPosition
 */
const createUserHandle = async (user, claimedPosition, maxQuePosition) => {
  // If the user has a quePosition already, use it. Else, get a new quePosition
  const handlePositioN = claimedPosition / maxQuePosition;
  // Generate the user handler
  const name = `${user.get('givenName')}${user
    .get('familyName')
    .substring(0, 1)}`;
  const userHandle = `@${name.toLowerCase()}_${handlePositioN}`;

  return userHandle.replace('.', '');
};

/**
 * If the actual state of the given user is 'inactive', changes it to 'active'
 * and creates default chat channels and a handle
 *
 * @param {*} user
 */
const setActiveStatus = async user => {
  if (!(user instanceof Parse.User)) {
    throw new UserServiceError('[zIslmc6c] User not found');
  }

  // If the user has an 'inactive' state, make it 'active'
  // This  updates the claimedPosition value and creates the handle for the user
  if (user.get('status') === 'inactive') {
    const maxQuePosition = await QuePositionsService.getMaxQuePosition();
    const claimedPosition = await QuePositionsService.getClaimedPosition();
    const handle = await createUserHandle(
      user,
      claimedPosition,
      maxQuePosition,
    );
    user.set('handle', handle);
    user.set('status', 'active');
    await user.save(null, { useMasterKey: true });
    await QuePositionsService.update('claimedPosition', claimedPosition);
  }

  // Create the user Feed object and the related initial posts
  await FeedService.createFeedForUser(user);
  await FeedService.createGeneralUnreadMessagesPost(user);

  // At this point, if the user hasn't 'active' status, he/she is in the waitlist
  // So default chat channels won't be created for the user yet.
  // Also, if the user is 'active', the Feed and the inicial unreadMessages posts are created
  if (user.get('status') === 'active') {
    // Check if the user has the initial channels already
    const userHasInitialChannels = await ChatService.userHasInitialChannels(
      user.id,
    );

    // If the user doesn't have the initial channels, create them
    if (!userHasInitialChannels) {
      await ChatService.createInitialChannels(user);
    }
  }

  return user;
};

/**
 * Creates the preference for the given user
 *
 * @param {*} fromUser
 * @param {*} toUser
 */
const createUserPreference = async (fromUser, toUser) => {
  let userPreferences = fromUser.get('userPreferences');
  const fromUserPreference = {
    userId: toUser.id,
    nickname: '',
    color: '',
    notes: '',
  };

  if (userPreferences) {
    userPreferences.push(fromUserPreference);
  } else {
    userPreferences = [fromUserPreference];
  }
  fromUser.set('userPreferences', userPreferences);
  await fromUser.save();
};

export default {
  createUser,
  asignDefaultRole,
  getLastSessionToken,
  clearUserSessions,
  deleteUserInstallations,
  deleteRituals,
  deleteConnections,
  deleteReservations,
  setActiveStatus,
  createUserPreference,
};
