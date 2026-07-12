// Vendor modules
import express from 'express';
import path from 'path';
import { createServer } from 'http';

// Jibber api
import api from './api';

const createJibberServer = async () => {
  const { PARSE_MOUNT } = process.env;

  // Parse Server 9 initializes adapters and Cloud Code asynchronously and
  // exposes its Express application only after start completes.
  await api.start();

  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use('/public', express.static(path.join(__dirname, '/public')));
  app.use(PARSE_MOUNT || '/parse', api.app);

  app.get('/', async (request, response) =>
    response.status(200).send({ health: 'ok', date: new Date() }),
  );

  return createServer(app);
};

export default createJibberServer;
