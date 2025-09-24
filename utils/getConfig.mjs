import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';

dotenv.config();

export const CONFIG_PATH = './u/config/dobi-server.js';

export const getConfig = () => {
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (err) {
      throw new Error(`error parsing config at ${CONFIG_PATH} - ${err.toString()}`);
    }


  } else if (process.env.DOBI_SERVER) {
    try {

      return JSON.parse(process.env.DOBI_SERVER);
    } catch (err) {
      throw new Error(`error parsing config at ${CONFIG_PATH} - ${err.toString()}`);
    }
  }
  throw new Error('dobi-server config not found');
}
