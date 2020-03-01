import Parse from '../../providers/ParseProvider';
import faker from 'faker';
import { isMobilePhone } from 'validator';
import ExtendableError from 'extendable-error-class';


class SeedDBError extends ExtendableError {}


/**
 * Create 1 user with faker data
 * @returns Promise
 */
export const makeUser = (options={}) => {
  const user = new Parse.User();

  // Build fake user
  const username = faker.random.uuid();
  const givenName = options.givenName || faker.name.firstName();
  const familyName = options.familyName || faker.name.lastName();
  const handle = options.username || faker.internet.userName(`${givenName} ${familyName}`);
  const password = options.password || faker.internet.password();
  const email = options.email || faker.internet.email();

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
  user.set('handle', handle);
  user.set('password', password);
  user.set('email', email);
  user.set('phoneNumber', phoneNumber);
  try {
    process.stdout.write('.');
    return user.signUp();
  } catch (error) {
    console.log('Error: ' + error.code + ' ' + error.message);
  }
};

export const makeReservation = (position=1, user=null) => {
  return new Parse.Schema('Reservation')
    .get()
    .then(schema => {
      const Reservation = Parse.Object.extend(schema);
      const reservation = new Reservation();
      reservation.set('position', position);
      reservation.set('code', faker.random.alphaNumeric(10));
      if (user instanceof Parse.User) {
        reservation.set('user', user);
      }
      try {
        process.stdout.write('.');
        return reservation.save();
      } catch (error) {
        console.log('Error: ' + error.code + ' ' + error.message);
      }
    });
};

/**
 * Seed database
 */
const seedDB = async () => {

  console.log('\nSeeding database with fake data...\n');

  const promises = [];

  // Make 50 fake users
  promises.push(Array.from(Array(50)).map(makeUser));

  // Make 100 reservations
  Array.from(Array(100)).map((_, idx) => promises.push(makeReservation(idx)));

  return await Promise
    .all(promises)
    .then(() => {
      console.log('\nDatabase seed complete.\n');
    });
};


export default seedDB;
