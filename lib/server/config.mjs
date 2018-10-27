/* eslint-disable no-process-env */

const {
  DOBI_DEBUG,
  HOME,
  HOMEPATH,
  NODE_ENV,
  USERPROFILE,
} = process.env;

export const USER_HOME = HOME || HOMEPATH || USERPROFILE;
export const USER_CONNECT_PATH = `${USER_HOME}/.dobi_connect`;

// Settings
export { DOBI_DEBUG };
export const IS_PROD = NODE_ENV === 'production';
export const USE_CACHE = IS_PROD;
export const USE_COMPRESSION = IS_PROD;
