require('dotenv').config()


const appId = process.env.APP_ID
const masterKey = process.env.MASTER_KEY
const appName = process.env.APP_NAME
const cloud = process.env.CLOUD
const databaseUri = process.env.DATABASE_URI


console.log({
  appId,
  masterKey,
  appName,
  cloud,
  databaseUri,
});

