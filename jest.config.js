// Transorm setup files to allow importing/exporting modules
const babelConfig = require('./babel.config');
require('@babel/register')(babelConfig);


// Hard coded test env vars
process.env.APP_NAME = 'test-benji-backend';
process.env.APP_ID ='test-app-id';
process.env.MASTER_KEY = 'test-master-key';
process.env.REST_API_KEY = 'rest-api-key';
process.env.BENJI_SECRET_PASSWORD_TOKEN = 'test-secret-password-token';
process.env.PORT = 1337;
process.env.DATABASE_URI = 'mongodb://127.0.0.1:27017/parse';
process.env.SERVER_URL = 'http://localhost:1337/parse';
process.env.CLOUD_CODE_MAIN = 'src/cloud';
process.env.PARSE_SERVER_LOG_LEVEL = 'silent';


module.exports = {
  collectCoverage: true,
  collectCoverageFrom : ['src/**/*.js', '!**/tests/**/*'],
  coverageDirectory: './coverage',
  moduleDirectories: ['node_modules', 'src'],
  roots: ['<rootDir>/src/'],
  verbose: true,
  globalSetup: '<rootDir>/src/tests/setup/testGlobalSetup.js',
  globalTeardown: '<rootDir>/src/tests/setup/testGlobalTeardown.js',
};
