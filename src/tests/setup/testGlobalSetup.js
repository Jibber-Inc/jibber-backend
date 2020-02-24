require('dotenv').config();

const { setup: setupDevServer } = require('jest-dev-server');
import testTeardown from './testGlobalTeardown';
import migrateMongo from './migrateMongo';
import seedDB from './seedDB';
import checkTwilioTestCredentials from './checkTwilioTestCredentials';

/**
 * https://jestjs.io/docs/en/configuration#globalsetup-string
 */
const globalSetup = async () => {

  // Spin up "jest-dev-server" to run during tests.
  await setupDevServer({
    command: 'npm run dev:src',
    launchTimeout: 50000,
    port: 1337,
    debug: true,
  })

    // Integration tests connect to twilio and must use special "test" credentials.
    .then(checkTwilioTestCredentials)

    // "Migrate" mongoDB from schemafiles
    .then(migrateMongo)
    .then(seedDB)

    // Catch any error, then run the test teardown script.
    // Throw back the caught error to finish terminating the test runner.
    // Ensures test server is not left running.
    .catch(error => {
      return testTeardown()
        .then(() => {
          throw new Error(error);
        });
    });
};


export default globalSetup;
