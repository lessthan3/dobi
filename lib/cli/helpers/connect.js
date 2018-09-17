'use strict';

const mongofb = require('dobi-mongofb');
const login = require('../commands/login');
const { log } = require('../utils');
const {
  DATABASE_URL,
  FIREBASE_URL,
} = require('../config');

const asyncAuth = (dbInstance, token) => new Promise((resolve, reject) => {
  dbInstance.auth(token, (err) => {
    if (err) {
      return reject(err);
    }
    return resolve();
  });
});

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
    firebase: FIREBASE_URL,
    server: DATABASE_URL,
  });
  dbInstance.cache = false;

  try {
    await asyncAuth(dbInstance, token);
    db = dbInstance;
    user = {
      ...userDoc,
      admin_uid: userDoc.uid.replace(/\./g, ','),
      token,
    };
    return { db, user };
  } catch (err) {
    throw new Error(`error authenticating: ${err.toString()}`);
  }
};
