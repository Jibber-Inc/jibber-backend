import ParseSDK from 'parse/node';

const Parse = global.Parse || ParseSDK;

if (!global.Parse) {
  if (process.env.APP_ID) {
    Parse.initialize(process.env.APP_ID, undefined, process.env.MASTER_KEY);
    Parse.serverURL = process.env.SERVER_URL;
  }
  global.Parse = Parse;
}

export default Parse;
