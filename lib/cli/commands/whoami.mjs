import login from './login.mjs';
import { log } from '../../utils.mjs';

export default async () => {
  const { user } = await login(false);
  if (!user) {
    throw new Error('not logged in. try "dobi login"');
  }
  log(JSON.stringify(user, null, 2));
};
