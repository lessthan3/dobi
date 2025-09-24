import fs from 'fs-extra';
import { asyncExists } from '../../utils.mjs';
import saveUserConfig from './saveUserConfig.mjs';
import { USER_CONFIG_PATH } from '../config.mjs';

export default async () => {
  const exists = await asyncExists(USER_CONFIG_PATH);
  if (exists) {
    try {
      const data = await fs.readFile(USER_CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      throw new Error(`unable to read user config: ${err.toString()}`);
    }
  }
  return saveUserConfig({});
};
