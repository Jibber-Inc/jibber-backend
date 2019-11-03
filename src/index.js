// Load .env variables
require('dotenv').config();

import express from 'express';
import path from 'path';
import { ParseServer } from 'parse-server';
import { createServer } from 'http';

// Load Environment Variables
const {
  APP_ID,
  APP_NAME,
  CLOUD_CODE_MAIN,
  DATABASE_URI,
  MASTER_KEY,
  SERVER_URL,
} = process.env;

console.log({
  APP_ID,
  APP_NAME,
  CLOUD_CODE_MAIN,
  DATABASE_URI,
  MASTER_KEY,
  SERVER_URL,
});

// Build parse server instance
var api = new ParseServer({
  appId: APP_ID,
  appName: APP_NAME,
  cloud: CLOUD_CODE_MAIN,
  databaseURI: DATABASE_URI,
  masterKey: MASTER_KEY,
  serverURL: SERVER_URL,
  liveQuery: {
    classNames: ['Posts', 'Comments'] // List of classes to support for query subscriptions
  },
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey



const app = express();



// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));



// Serve the Parse API on the /parse URL prefix
const mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);



// Parse Server plays nicely with the rest of your web routes
app
  .get('/', (_, res) => res
    .status(200)
    .send('I dream of being a website.'));



// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app
  .get('/test', (_, res) => res
    .sendFile(path.join(__dirname, '/public/test.html')));



const port = process.env.PORT || 1337;
const httpServer = createServer(app);
httpServer
  .listen(port, () => console
    .log(`${ process.env.APP_NAME } running on port ${ port }.`));



// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
