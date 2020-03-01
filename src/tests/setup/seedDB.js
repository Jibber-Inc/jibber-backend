import Parse from '../../providers/ParseProvider';
import faker from 'faker';


/**
 * Create 1 user with faker data
 * @returns Promise
 */
export const makeUser = () => {
  const user = new Parse.User();
  const username = faker.name.findName();
  const password = faker.internet.password();
  const email = faker.internet.email();
  user.set('username', username);
  user.set('password', password);
  user.set('email', email);
  try {
    process.stdout.write('.');
    return user.signUp();
  } catch (error) {
    console.log('Error: ' + error.code + ' ' + error.message);
  }
};

export const makeReservation = position => {
  return new Parse.Schema('Reservation')
    .get()
    .then(schema => {
      const Reservation = Parse.Object.extend(schema);
      const reservation = new Reservation();
      reservation.set('position', position);
      reservation.set('code', faker.random.alphaNumeric(10));
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
