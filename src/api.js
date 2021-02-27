import { ParseServer } from 'parse-server';

require('dotenv').config();

// Load Environment Variables
const {
  APP_ID,
  APP_NAME,
  CLOUD_CODE_MAIN,
  DATABASE_URI,
  MASTER_KEY,
  SERVER_URL,
  PUBLIC_SERVER_URL,
  REST_API_KEY,
  PARSE_SERVER_LOG_LEVEL,
  IOS_PFX_CERTIFICATE,
  IOS_PASSPHRASE,
  IOS_PUSH_PRODUCTION = false,
  IOS_TOPIC = 'com.Benji.Ours',
  REDIS_URL,
} = process.env;

// Build parse server instance
const api = new ParseServer({
  appId: APP_ID,
  appName: APP_NAME,
  cloud: CLOUD_CODE_MAIN || `${__dirname}/cloud/`,
  databaseURI: DATABASE_URI,
  masterKey: MASTER_KEY,
  restApiKey: REST_API_KEY,
  serverURL: SERVER_URL,
  publicServerURL: PUBLIC_SERVER_URL,
  logLevel: PARSE_SERVER_LOG_LEVEL || 'info',
  push: {
    ios: {
      pfx: IOS_PFX_CERTIFICATE,
      passphrase: IOS_PASSPHRASE,
      topic: IOS_TOPIC,
      production: IOS_PUSH_PRODUCTION,
    },
  },
  liveQuery: {
    // List of classes to support for query subscriptions
    classNames: ['QuePositions', 'Post', 'Feed', '_User', 'Ritual'],
    redisUrl: REDIS_URL,
  },
  protectedFields: {
    _User: {
      '*': ['hashcode'],
    },
  },
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

export default api;
