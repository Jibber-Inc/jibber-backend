import Parse from 'parse/node';

const { APP_ID, JAVASCRIPT_KEY, MASTER_KEY, SERVER_URL } = process.env;

Parse.initialize(APP_ID, JAVASCRIPT_KEY, MASTER_KEY);
Parse.serverURL = SERVER_URL;

export default Parse;
