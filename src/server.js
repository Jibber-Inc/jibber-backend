// Vendor modules
import express from 'express';
import path from 'path';
import twilio from 'twilio';
import { createServer } from 'http';

// Benji api
import api from './api';

// Twilio Webhooks
import chatBeforeEvent from './chatEventWebhooks/chatBeforeEvent';
import chatAfterEvent from './chatEventWebhooks/chatAfterEvent';

// Load Environment Variables
const { PARSE_MOUNT } = process.env;


// create express app
const app = express();

// Built in middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

// Twilio Pre/Post Even Webhooks
app.post('/chatBeforeEvent', twilio.webhook(), chatBeforeEvent);
app.post('/chatAfterEvent', twilio.webhook(), chatAfterEvent);


export default createServer(app);
