'use strict';

const mongofb = require('dobi-mongofb');
const login = require('../commands/login');
const { log } = require('../../utils');
const {
  DATABASE_URL,
  FB_DATABASE_URL,
  FB_LEGACY_SECRET,
  FB_WEB_API_KEY,
} = require('../config');

let db;
let user;
module.exports = async () => {
  if (db && user) {
    return { db, user };
  }
  const { token, user: userDoc } = await login();
  if (!userDoc) {
    throw new Error('please login first: `dobi login`');
  }

  log('connecting to firebase');
  const dbInstance = new mongofb.client.Database({
    api: DATABASE_URL,
    cache: false,
    firebase: {
      apiKey: FB_WEB_API_KEY,
      databaseURL: FB_DATABASE_URL,
      legacySecret: FB_LEGACY_SECRET,
    },
  });

  await dbInstance.auth(token);
  db = dbInstance;
  user = {
    ...userDoc,
    admin_uid: userDoc.uid.replace(/\./g, ','),
    token,
  };
  return { db, user };
};
