import { ParseServer } from 'parse-server';
import server from './server';

const PORT = process.env.PORT || 1337;
const { APP_NAME, REDIS_URL } = process.env;

// eslint-disable-next-line no-console
server.listen(PORT, () => console.log(`${APP_NAME} running on port ${PORT}.`));

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(server, {
  // classNames: ['QuePositions'],
  redisUrl: REDIS_URL,
});
