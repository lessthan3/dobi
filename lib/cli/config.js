'use strict';

const { existsSync } = require('fs');
const path = require('path');

const configPath = '/u/config/dobi-server.js';
// eslint-disable-next-line import/no-dynamic-require
const dobiConfig = existsSync(configPath) ? require(configPath) : {};

const {
  cwd,
  env: {
    HOME,
    HOMEPATH,
    USERPROFILE,
  },
} = process;

const CWD = cwd();
const AUTH_SITE_ID = '53264fd5b275f4282d1468d7';
const CACHE_BUST_RESOURCE = 'https://www.maestro.io/pkg/lt3-api/4.0/api/cache/bust';
const DATABASE_URL = 'https://www.maestro.io/db/1.0';
const FB_DATABASE_URL = 'https://lessthan3.firebaseio.com';
const PRIMARY_FIREBASE = 'lessthan3';
const FB_WEB_API_KEY = 'AIzaSyD6OhCRWmpfwPmgSlNz1uZK4lhrLBFpFLs';
const FB_LEGACY_SECRET = dobiConfig.firebases.lessthan3.secret;
const HASH_PATH = path.join(CWD, '/.dobihash.json');
const USER_HOME = HOME || HOMEPATH || USERPROFILE;
const USER_CONFIG_PATH = path.join(USER_HOME, '.dobi_config');

module.exports = {
  AUTH_SITE_ID,
  CACHE_BUST_RESOURCE,
  CWD,
  DATABASE_URL,
  dobiConfig,
  FB_DATABASE_URL,
  FB_LEGACY_SECRET,
  FB_WEB_API_KEY,
  HASH_PATH,
  PRIMARY_FIREBASE,
  USER_CONFIG_PATH,
};
