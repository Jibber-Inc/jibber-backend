// Load .env variables
require('dotenv').config();

import express from 'express';
import path from 'path';
import { ParseServer } from 'parse-server';
import { createServer } from 'http';



// Build parse server instance
const api = new ParseServer({
  appId: process.env.APP_ID || 'BenjiApp',
  appName: process.env.APP_NAME || 'benji-backend',
  cloud: process.env.CLOUD_CODE_MAIN || 'src/cloud/main.js',
  databaseURI: process.env.DATABASE_URI || 'mongodb://localhost:27017/dev',
  masterKey: process.env.MASTER_KEY || 'theStupidMasterKeyThatShouldBeSecret',
  serverURL: process.env.SERVER_URL || 'https://benji-backend.herokuapp.com/parse',
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
