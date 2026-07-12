require('dotenv').config();
const { setup: setupDevServer } = require('jest-dev-server');
import tcp from 'tcp-port-used';
import testTeardown from './testGlobalTeardown';
import migrateMongo from './migrateMongo';
import manageMongo from './manageMongo';
import seedDB from './seedDB';


/**
 * https://jestjs.io/docs/en/configuration#globalsetup-string
 */
const globalSetup = async () => {

  const PORT = process.env.PORT || 1337;

  // Spin up "jest-dev-server" to run during tests.
  await tcp.check(Number(PORT) , '127.0.0.1')
    .then(is_in_use => {
      if (is_in_use) {
        throw new Error(
          `[PDBV8IbN] Cannot start test run. Port ${ PORT } is in use.`
        );
      }
    })
    .then(async () => {
      globalThis.servers = await setupDevServer({
        command: 'npm run dev:src',
        launchTimeout: 50000,
        port: 1337,
        usedPortAction: 'error',
        debug: true,
      });
    })

    // "Migrate" mongoDB from schemafiles, update indexes, and seed db for test
    .then(migrateMongo)
    .then(manageMongo)
    .then(() =>
      process.env.SKIP_TEST_DATABASE_SEED === 'true' ? undefined : seedDB(),
    )

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
