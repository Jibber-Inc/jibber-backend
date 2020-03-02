const util = require('util');
const exec = util.promisify(require('child_process').exec);

const script = `
SERVER_URL=${process.env.SERVER_URL}
APP_ID=${process.env.APP_ID}
MASTER_KEY=${process.env.MASTER_KEY} python3 scripts/migrate.py
`;

/**
 * Execute the script using python.
 */
const migrateMongo = async () => {
  try {
    const { stdout } = await exec(script);
    console.log(stdout);
  } catch (err) {
    console.log('stderr:', { err });
  }
};


export default migrateMongo;
