const { teardown: teardownDevServer } = require('jest-dev-server');


/**
 * https://jestjs.io/docs/en/configuration#globalteardown-string
 */
const globalTeardown = async () => {

  const magenta = '\x1b[35m';
  const reset = '\x1b[0m';

  console.log(`\n${ magenta }[Jest Dev server] Tearing down test http server...`);
  await teardownDevServer()
    .then(() => console.log(`[Jest Dev server] ...done${ reset }`));
};


export default globalTeardown;
