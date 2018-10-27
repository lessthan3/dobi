import login from './login';
import { log } from '../../utils';

export default async () => {
  const { user } = await login(false);
  if (!user) {
    throw new Error('not logged in. try "dobi login"');
  }
  log(JSON.stringify(user, null, 2));
};
