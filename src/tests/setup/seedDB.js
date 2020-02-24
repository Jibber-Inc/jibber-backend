import Parse from '../../services/ParseServiceProvider';
import faker from 'faker';


/**
 * Create 1 user with faker data
 * @returns Promise
 */
const makeUser = () => {
  const user = new Parse.User();
  const username = faker.name.findName();
  const password = faker.internet.password();
  const email = faker.internet.email();
  user.set('username', username);
  user.set('password', password);
  user.set('email', email);
  try {
    console.log(`Creating user: ${user.get('username') } ${ user.get('email') }`);
    return user.signUp();
  } catch (error) {
    console.log('Error: ' + error.code + ' ' + error.message);
  }
};

const makeReservation = position => {
  return new Parse.Schema('Reservation')
    .get()
    .then(schema => {
      const Reservation = Parse.Object.extend(schema);
      const reservation = new Reservation();
      reservation.set('position', position);
      reservation.set('code', faker.random.alphaNumeric(10));
      try {
        console.log(`Creating reservation: ${ reservation.get('code') }`);
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
