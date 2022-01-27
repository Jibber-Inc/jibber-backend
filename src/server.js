// Vendor modules
import express from 'express';
import path from 'path';
import { createServer } from 'http';

// Jibber api
import api from './api';

// Stream Webhooks
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

// health endpoint
app.get('/', async (request, response) =>
  response.status(200).send({ health: 'ok', date: new Date() }),
);

// Stream Pre/Post Even Webhooks
console.log('******* SERVER ******************')
app.post('/stream/chatBeforeEvent', chatBeforeEvent);
app.post('/stream/chatAfterEvent', chatAfterEvent);

export default createServer(app);
