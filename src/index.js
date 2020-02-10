import server from './server';
import { ParseServer } from 'parse-server';


const PORT = process.env.PORT || 1337;
const APP_NAME = process.env.APP_NAME;


server.listen(PORT, () =>
  console.log(
    `${ APP_NAME } running on port ${ PORT }.`
  ));


// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(server);
