// Vendor modules
import express from 'express';
import path from 'path';
import { createServer } from 'http';

// Benji api
import api from './api';

// Load Environment Variables
const { PARSE_MOUNT } = process.env;


const app = express();


// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
app.use(PARSE_MOUNT || '/parse', api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', async (request, response) =>
  response
    .status(200)
    .send('I dream of being a website.'));

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/hello', async (request, response) =>
  response
    .sendFile(path.join(__dirname, '/hello.html')));


export default createServer(app);
