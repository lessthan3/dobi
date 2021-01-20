import dotenv from 'dotenv';
dotenv.config();

import { existsSync, readFileSync } from 'fs';

export const CONFIG_PATH = '/u/config/dobi-server.js';

export const getConfig = () => {
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (err) {
      throw new Error(`error parsing config at ${CONFIG_PATH} - ${err.toString()}`);
    }

  // eslint-disable-next-line no-process-env
  } else if (process.env.DOBI_SERVER) {
    try {
      // eslint-disable-next-line no-process-env
      return JSON.parse(process.env.DOBI_SERVER);
    } catch (err) {
      throw new Error(`error parsing config at ${CONFIG_PATH} - ${err.toString()}`);
    }
  }
  throw new Error('dobi-server config not found');
}
