import axios from 'axios';
import firebase from 'firebase';
import inquirer from 'inquirer';
import { log } from '../../utils';
import {
  AUTH_SITE_ID,
  FB_DATABASE_URL,
  FB_WEB_API_KEY,
} from '../config';
import readUserConfig from '../helpers/readUserConfig';
import saveUserConfig from '../helpers/saveUserConfig';

const fb = firebase.initializeApp({
  apiKey: FB_WEB_API_KEY,
  databaseURL: FB_DATABASE_URL,
}, 'dobi-auth-client');

const loginEmail = async () => {
  // prompt
  const { email, password } = await inquirer.prompt([{
    message: 'Enter your email',
    name: 'email',
    type: 'input',
  }, {
    message: 'Enter your password',
    name: 'password',
    type: 'password',
  }]);

  let user;
  try {
    const url = 'https://api.maestro.io/auth/v1/login/maestro';
    const { data } = await axios.post(url, {
      email,
      firebase: 'lessthan3',
      password,
      site_id: AUTH_SITE_ID,
    });
    user = data;
  } catch ({ response }) {
    throw new Error(`${response.status} - ${response.data}`);
  }

  const { custom_token: customToken } = user;
  if (!customToken) {
    throw new Error('invalid response from server');
  }

  await fb.auth().signInWithCustomToken(customToken);
  const idTokenResult = await fb.auth().currentUser.getIdTokenResult();
  const { refreshToken } = fb.auth().currentUser;
  return { idTokenResult, refreshToken };
};

const loginRefreshToken = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new Error('invalid refresh token');
  }

  let user;
  try {
    const url = 'https://api.maestro.io/auth/v1/login/refresh-token';
    const { data } = await axios.post(url, {
      firebase: 'lessthan3',
      refresh_token: refreshToken,
      site_id: AUTH_SITE_ID,
    });
    user = data;
  } catch ({ response }) {
    throw new Error(`${response.status} - ${response.data}`);
  }

  const { custom_token: customToken } = user;
  if (!customToken) {
    throw new Error('invalid response from server');
  }

  await fb.auth().signInWithCustomToken(customToken);
  const idTokenResult = await fb.auth().currentUser.getIdTokenResult();
  return { idTokenResult, refreshToken };
};

/**
 * @param {boolean} [requireLoggedIn=false]
 */
export default async (requireLoggedIn = true) => {
  const userConfig = await readUserConfig();
  let { refreshToken } = userConfig;
  if (!requireLoggedIn && !refreshToken) {
    return { user: null };
  }
  let idTokenResult;
  if (refreshToken) {
    ({ idTokenResult, refreshToken } = await loginRefreshToken({ refreshToken }));
  } else if (requireLoggedIn) {
    log('not logged in - must authenticate');
    ({ idTokenResult, refreshToken } = await loginEmail());
  }

  const newUserConfig = saveUserConfig({
    refreshToken,
    user: {
      ...idTokenResult,
    },
  });
  log('you are now logged in.');
  return newUserConfig;
};
