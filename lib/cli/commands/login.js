'use strict';

const axios = require('axios');
const firebase = require('firebase');
const admin = require('firebase-admin');
const inquirer = require('inquirer');
const { log } = require('../../utils');
const {
  AUTH_SITE_ID,
  FB_DATABASE_URL,
  FB_WEB_API_KEY,
  dobiConfig,
} = require('../config');
const readUserConfig = require('../helpers/readUserConfig');
const saveUserConfig = require('../helpers/saveUserConfig');

const fb = firebase.initializeApp({
  apiKey: FB_WEB_API_KEY,
  databaseURL: FB_DATABASE_URL,
}, 'dobi-auth-client');

const { credential } = dobiConfig.firebases.lessthan3.admin;
const fbAdmin = admin.initializeApp({
  credential: admin.credential.cert(credential),
  databaseURL: FB_DATABASE_URL,
}, 'dobi-auth-admin');

const getUser = async ({ email, password }) => {
  try {
    const url = 'https://www.maestro.io/pkg/dobi-api/4.0/api/auth3/login';
    const { data } = await axios.post(url, {
      email,
      password,
      site_id: AUTH_SITE_ID,
    });
    return data;
  } catch ({ response }) {
    throw new Error(`${response.status} - ${response.data}`);
  }
};

const payloadFields = [
  '_id',
  'id',
  'email',
  'image',
  'name',
  'service',
  'site_id',
  'uid',
  'username',
];
const generateCustomToken = async (user) => {
  const payload = payloadFields.reduce((obj, key) => {
    if (user[key]) {
      return { ...obj, [key]: user[key] };
    }
    return { user: obj };
  }, {});

  const token = await fbAdmin.auth().createCustomToken(user._id, payload);
  await fb.auth().signInWithCustomToken(token);
  const idToken = await fb.auth().currentUser.getIdToken(true);
  const decodedIdToken = await fbAdmin.auth().verifyIdToken(idToken);
  return { decodedIdToken, token };
};

const getIdToken = async () => {
  const { email, password } = await inquirer.prompt([{
    message: 'Enter your email',
    name: 'email',
    type: 'input',
  }, {
    message: 'Enter your password',
    name: 'password',
    type: 'password',
  }]);

  // get user
  const user = await getUser({ email, password });
  return generateCustomToken(user);
};

/**
 * @param {boolean} [requireLoggedIn=false]
 */
module.exports = async (requireLoggedIn = true) => {
  const userConfig = await readUserConfig();
  const {
    user,
  } = userConfig;
  if (!requireLoggedIn && !user) {
    return { user: null };
  }
  let decodedIdToken;
  let token;
  if (user) {
    ({ decodedIdToken, token } = await generateCustomToken(user));
  } else if (requireLoggedIn) {
    log('not logged in - must authenticate');
    ({ decodedIdToken, token } = await getIdToken());
  }

  const newUserConfig = saveUserConfig({
    token,
    user: {
      ...decodedIdToken,
    },
  });
  log('you are now logged in.');
  return newUserConfig;
};
