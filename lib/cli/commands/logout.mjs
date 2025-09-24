import { saveUserConfig } from '../helpers/index.mjs';
import { log } from '../../utils.mjs';

export default async () => {
  await saveUserConfig({});
  log('you are logged out');
};
