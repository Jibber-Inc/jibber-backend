import { ParseServer } from 'parse-server';
import createJibberServer from './server';

const PORT = process.env.PORT || 1337;
const { APP_NAME, REDIS_URL } = process.env;

const start = async () => {
  const server = await createJibberServer();

  // This will enable the Live Query real-time server.
  ParseServer.createLiveQueryServer(server, {
    redisURL: REDIS_URL,
  });

  // eslint-disable-next-line no-console
  server.listen(PORT, () => console.log(`${APP_NAME} running on port ${PORT}.`));
};

start().catch(error => {
  // eslint-disable-next-line no-console
  console.error('Jibber backend failed to start.', error);
  process.exitCode = 1;
});
