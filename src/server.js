// Vendor modules
import express from 'express';
import path from 'path';
import { createServer } from 'http';

// Benji api
import api from './api';

// Twilio Webhooks
// import chatBeforeEvent from './chatEventWebhooks/chatBeforeEvent';
// import chatAfterEvent from './chatEventWebhooks/chatAfterEvent';

// Stream Webhooks
import chatEvents from './chatEventWebhooks/chatEvents';

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

// health endpoint
app.get('/', async (request, response) =>
  response.status(200).send({ health: 'ok', date: new Date() }),
);

// Twilio Pre/Post Even Webhooks
// app.post('/chatBeforeEvent', twilio.webhook(), chatBeforeEvent);
// app.post('/chatAfterEvent', twilio.webhook(), chatAfterEvent);

app.post('/stream/webhook', chatEvents);

export default createServer(app);
