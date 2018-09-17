'use strict';

const Firebase = require('firebase');
const readline = require('readline');
const opn = require('opn');
const { log } = require('../utils');
const { FIREBASE_URL } = require('../config');
const readUserConfig = require('../helpers/readUserConfig');
const saveUserConfig = require('../helpers/saveUserConfig');

// helpers
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const fb = new Firebase(FIREBASE_URL);
const asyncFbAuth = token => new Promise((resolve, reject) => {
  fb.authWithCustomToken(token, (err, data) => {
    if (err) {
      return reject(new Error('invalid token'));
    }
    return resolve(data);
  });
});

const asyncGetToken = message => new Promise((resolve, reject) => {
  rl.question(message, (token) => {
    if (!token) {
      return reject(new Error('must specify token'));
    }
    return resolve(token);
  });
});

/**
 * @param {boolean} [requireLoggedIn=false]
 */
module.exports = async (requireLoggedIn = true) => {
  const userConfig = await readUserConfig();
  const {
    user,
  } = userConfig;
  if (user) {
    return userConfig;
  }
  if (!requireLoggedIn) {
    return { user: null };
  }

  log('not logged in: must authenticate');
  log('opening login portal in just a few moments');
  opn('http://www.maestro.io/developers/auth');
  const token = await asyncGetToken('Enter Token: ');
  const fbToken = await asyncFbAuth(token);
  const newUserConfig = saveUserConfig({
    ...userConfig,
    token,
    token_expires: fbToken.expires,
    user: fbToken.auth,
  });
  log('you are now logged in.');
  return newUserConfig;
};
