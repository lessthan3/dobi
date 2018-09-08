'use strict';

const {
  DOBI_DEBUG,
  HOME,
  HOMEPATH,
  LT3_ENV,
  USERPROFILE,
} = process.env;

const USER_HOME = HOME || HOMEPATH || USERPROFILE;
const USER_CONNECT_PATH = `${USER_HOME}/.dobi_connect`;

// Settings
const IS_PROD = LT3_ENV === 'prod';
const USE_CACHE = IS_PROD;
const USE_COMPRESSION = IS_PROD;

module.exports = {
  DOBI_DEBUG,
  IS_PROD,
  USE_CACHE,
  USE_COMPRESSION,
  USER_CONNECT_PATH,
};
