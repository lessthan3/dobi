import { saveUserConfig } from '../helpers';
import { log } from '../../utils';

export default async () => {
  await saveUserConfig({});
  log('you are logged out');
};
