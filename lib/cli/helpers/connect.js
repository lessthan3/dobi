'use strict';

const admin = require('firebase-admin');
const login = require('../commands/login');
const { log } = require('../../utils');
const {
  dobiConfig,
  FB_DATABASE_URL,
} = require('../config');

const { credential } = dobiConfig.firebases.lessthan3.admin;

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
  db = admin.initializeApp({
    credential: admin.credential.cert(credential),
    databaseURL: FB_DATABASE_URL,
  }, 'dobi-auth-admin');

  user = {
    ...userDoc,
    admin_uid: userDoc.uid.replace(/\./g, ','),
    token,
  };
  return { db, user };
};
