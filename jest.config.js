// Set test env vars
process.env.APP_NAME = 'test-benji-backend';
process.env.APP_ID ='test-app-id';
process.env.MASTER_KEY = 'test-master-key';
process.env.BENJI_SECRET_PASSWORD_TOKEN = 'test-secret-password-token';
process.env.PORT = 1337;
process.env.PARSE_MOUNT = '/parse';
process.env.CLOUD_CODE_MAIN = 'src/cloud/main';
process.env.DATABASE_URI = 'mongodb://127.0.0.1:27017/parse';
process.env.SERVER_URL = 'http://localhost:1337/parse';


module.exports = {
  collectCoverage: true,
  collectCoverageFrom : ['src/**/*.js'],
  coverageDirectory: './coverage',
  moduleDirectories: ['node_modules', 'src'],
  roots: ['<rootDir>/src/'],
  verbose: true,
};
