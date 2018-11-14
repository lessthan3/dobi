import fs from 'fs-extra';
import { USER_CONFIG_PATH } from '../config';

/**
 * @param {Object} data
 */
export default async (data) => {
  try {
    await fs.writeFile(USER_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
    return data;
  } catch (err) {
    throw new Error(`unable to write user config: ${err.toString()}`);
  }
};
