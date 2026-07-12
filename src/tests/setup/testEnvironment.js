import Parse from 'parse/node';

Parse.initialize(process.env.APP_ID, undefined, process.env.MASTER_KEY);
Parse.serverURL = process.env.SERVER_URL;

global.Parse = Parse;
