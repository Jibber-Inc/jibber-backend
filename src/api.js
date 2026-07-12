import { ParseServer } from 'parse-server';
import { MESSAGING_LIVE_QUERY_CLASSES } from './constants/messaging';

const PushAdapter = require('@parse/push-adapter').default;

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
  PARSE_SERVER_LOG_LEVEL,
  IOS_PUSH_PRODUCTION,
  REDIS_URL,
  S3_BUCKET,
  IOS_KEY_ID,
  IOS_TEAM_ID,
  IOS_BUNDLE_ID,
  IOS_APN_KEY,
} = process.env;

const pushOptions = {
  ios: {
    token: {
      key: IOS_APN_KEY,
      keyId: IOS_KEY_ID,
      teamId: IOS_TEAM_ID // The Team ID for your developer account
    },
    topic: IOS_BUNDLE_ID, // The bundle identifier associated with your app
    production: IOS_PUSH_PRODUCTION === 'true'
  },
};

const hasPushConfiguration = [
  IOS_APN_KEY,
  IOS_KEY_ID,
  IOS_TEAM_ID,
  IOS_BUNDLE_ID,
].every(Boolean);

const pushConfiguration = hasPushConfiguration
  ? {
    push: {
      adapter: new PushAdapter(pushOptions),
    },
  }
  : {};

const filesConfiguration = S3_BUCKET
  ? {
    filesAdapter: {
      module: '@parse/s3-files-adapter',
      options: {
        bucket: S3_BUCKET,
      },
    },
  }
  : {};

// Build parse server instance
const api = new ParseServer({
  appId: APP_ID,
  appName: APP_NAME,
  cloud: CLOUD_CODE_MAIN || `${__dirname}/cloud/`,
  databaseURI: DATABASE_URI,
  masterKey: MASTER_KEY,
  serverURL: SERVER_URL,
  publicServerURL: PUBLIC_SERVER_URL,
  logLevel: PARSE_SERVER_LOG_LEVEL || 'info',
  ...pushConfiguration,
  liveQuery: {
    // List of classes to support for query subscriptions
    classNames: [
      'QuePositions',
      'Notice',
      '_User',
      'Connection',
      'Achievement',
      'Transaction',
      'Reservation',
      'Moment',
      ...MESSAGING_LIVE_QUERY_CLASSES,
    ],
    redisURL: REDIS_URL,
  },
  protectedFields: {
    _User: {
      '*': ['hashcode'],
    },
  },
  ...filesConfiguration,
  maxUploadSize: '50mb',
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

export default api;
