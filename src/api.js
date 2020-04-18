// Load .env variables
require('dotenv').config();


import { ParseServer } from 'parse-server';

const {
  APP_ID,
  APP_NAME,
  CLOUD_CODE_MAIN,
  DATABASE_URI,
  MASTER_KEY,
  SERVER_URL,
  REST_API_KEY,
  PARSE_SERVER_LOG_LEVEL,
  IOS_PFX_CERTIFICATE,
  IOS_PASSPHRASE
} = process.env;

// Build parse server instance
const api = new ParseServer({
  appId: APP_ID,
  appName: APP_NAME,
  cloud: CLOUD_CODE_MAIN || 'dist/cloud',
  databaseURI: DATABASE_URI,
  masterKey: MASTER_KEY,
  restApiKey: REST_API_KEY,
  serverURL: SERVER_URL,
  logLevel: PARSE_SERVER_LOG_LEVEL || 'info',
  push: {
    ios: {
      pfx: IOS_PFX_CERTIFICATE,
      passphrase: IOS_PASSPHRASE,
      topic: 'com.Benji.Benji',
      production: true,
    },
  },
  liveQuery: {
    // List of classes to support for query subscriptions
    classNames: [
      'Posts',
      'Comments',
    ],
  },
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey


export default api;
