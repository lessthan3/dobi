import path from 'path';
import { getConfig } from '../../utils/getConfig.mjs';

const {
  cwd,
  env: {
    HOME,
    HOMEPATH,
    USERPROFILE,
  },
} = process;

// Lazy-load config only when needed (not on module import)
let _dobiConfig;
export const getDobiConfig = async () => {
  if (!_dobiConfig) {
    _dobiConfig = await getConfig();
  }
  return _dobiConfig;
};

export const CWD = cwd();
export const AUTH_SITE_ID = '53264fd5b275f4282d1468d7';
export const CACHE_BUST_RESOURCE = 'https://www.maestro.io/pkg/lt3-api/4.0/api/cache/bust';
export const FB_DATABASE_URL = 'https://lessthan3.firebaseio.com';
export const FB_WEB_API_KEY = 'AIzaSyD6OhCRWmpfwPmgSlNz1uZK4lhrLBFpFLs';
export const HASH_PATH = path.join(CWD, '/.dobihash.json');
export const USER_HOME = HOME || HOMEPATH || USERPROFILE;
export const USER_CONFIG_PATH = path.join(USER_HOME, '.dobi_config.mjs');
