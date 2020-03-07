import Parse from '../../providers/ParseProvider';
import faker from 'faker';
import { isMobilePhone } from 'validator';
import ExtendableError from 'extendable-error-class';


class SeedDBError extends ExtendableError {}


/**
 * Create 1 user with faker data
 * @returns Promise
 */
export const makeUser = async (options={}) => {
  const user = new Parse.User();

  // Build fake user
  const username = faker.random.uuid();
  const givenName = options.givenName || faker.name.firstName();
  const familyName = options.familyName || faker.name.lastName();
  // const handle = options.username || faker.internet.userName(`${givenName} ${familyName}`);
  const password = options.password || faker.internet.password();
  const email = options.email || faker.internet.email();
  const reservation = options.reservation || undefined;

  // Faker generates some invalid phone numbers (leading 0/1 etc)...
  // https://github.com/Marak/faker.js/issues/297
  const phoneNumber = options.phoneNumber || `1206${Math.floor(200 + Math.random() * 800)}${Math.floor(1000 + Math.random() * 9000)}`;
  if (!isMobilePhone(phoneNumber, 'en-US')) {
    throw new SeedDBError('[gDtUeBum] Invalid phone number');
  }

  // Save fake user
  user.set('username', username);
  user.set('givenName', givenName);
  user.set('familyName', familyName);
  // user.set('handle', handle);
  user.set('password', password);
  user.set('email', email);
  user.set('phoneNumber', phoneNumber);
  user.set('reservation', reservation);

  try {
    process.stdout.write('.');
    return user.signUp();
  } catch (error) {
    console.log('Error: ' + error.code + ' ' + error.message);
  }
};

export const makeReservation = (user=null) => {
  return new Parse.Schema('Reservation')
    .get()
    .then(schema => {
      const Reservation = Parse.Object.extend(schema);
      const reservation = new Reservation();
      reservation.set('code', faker.random.alphaNumeric(10));
      if (user instanceof Parse.User) {
        reservation.set('user', user);
      }
      try {
        process.stdout.write('.');
        return reservation.save();
      } catch (error) {
        console.error(`error ${error.code} ${error.message}`);
      }
    });
};

/**
 * Create a connection
 * @param {Parse.User} to
 * @param {Parse.User} from
 */
export const makeConnection = (to, from) => {
  return new Parse.Schema('Connection')
    .get()
    .then(schema => {
      const Connection = Parse.Object.extend(schema);
      const connection = new Connection();
      connection.set('to', to);
      connection.set('from', from);
      try {
        process.stdout.write('.');
        return connection.save();
      } catch(error) {
        console.error(`error ${error.code} ${error.message}`);
      }
    });
};

/**
 * Seed database
 */
const seedDB = async () => {

  console.log('\nSeeding database with fake data...\n');

  const ReservationCount = Parse.Object.extend('ReservationCount');
  const reservationCount = new ReservationCount();
  await reservationCount.save();

  // Make 100 reservations
  return Promise
    .all(Array.from(Array(100)).map(makeReservation))
    .then(async reservations => {

      // Make 1 user per reservation
      return Promise
        .all(reservations.map(reservation => makeUser({ reservation })))

        // Done.
        .then(() => console.log('\nDatabase seed complete.\n'));
    });
};


export default seedDB;
