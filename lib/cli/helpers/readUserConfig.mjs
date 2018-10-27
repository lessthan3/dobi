import { asyncExists, asyncReadFile } from '../../utils';
import saveUserConfig from './saveUserConfig';
import { USER_CONFIG_PATH } from '../config';

export default async () => {
  const exists = await asyncExists(USER_CONFIG_PATH);
  if (exists) {
    try {
      const data = await asyncReadFile(USER_CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      throw new Error(`unable to read user config: ${err.toString()}`);
    }
  }
  return saveUserConfig({});
};
