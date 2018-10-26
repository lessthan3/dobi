import { USER_CONFIG_PATH } from '../config';
import { asyncWriteFile } from '../../utils';

/**
 * @param {Object} data
 */
export default async (data) => {
  try {
    await asyncWriteFile(USER_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
    return data;
  } catch (err) {
    throw new Error(`unable to write user config: ${err.toString()}`);
  }
};
