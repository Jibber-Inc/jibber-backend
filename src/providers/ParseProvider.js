// Back4App managed Cloud Code injects Parse globally. Keep the SDK require
// lazy so the same source also runs in the standalone server and test suites
// without loading a second SDK inside Back4App.
// eslint-disable-next-line global-require
const loadParseSDK = () => require('parse/node');
const ParseSDK = global.Parse ? null : loadParseSDK();
const Parse = global.Parse || ParseSDK.default || ParseSDK;

if (!global.Parse) {
  if (process.env.APP_ID) {
    Parse.initialize(process.env.APP_ID, undefined, process.env.MASTER_KEY);
    Parse.serverURL = process.env.SERVER_URL;
  }
  global.Parse = Parse;
}

export default Parse;
