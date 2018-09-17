'use strict';

const { existsSync } = require('fs');
const path = require('path');

const configPath = '/u/config/dobi-server';
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
const CACHE_BUST_RESOURCE = 'https://www.maestro.io/pkg/lt3-api/4.0/api/cache/bust';
const DATABASE_URL = 'https://www.maestro.io/db/1.0';
const FIREBASE_URL = 'https://lessthan3.firebaseio.com';
const HASH_PATH = path.join(CWD, '/.dobihash.json');
const USER_HOME = HOME || HOMEPATH || USERPROFILE;
const USER_CONFIG_PATH = path.join(USER_HOME, '.lt3_config');

module.exports = {
  CACHE_BUST_RESOURCE,
  CWD,
  DATABASE_URL,
  dobiConfig,
  FIREBASE_URL,
  HASH_PATH,
  USER_CONFIG_PATH,
};
