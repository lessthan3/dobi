import fs from 'fs-extra';
import { USER_CONNECT_PATH } from '../config';
import Watcher from '../Watcher';
import connectFB from '../firebaseUtils';

let watcher;
let firebase;
export default async (ctx) => {
  const { dobiConfig } = ctx.state;
  ctx.assert(dobiConfig, 500, 'connect: missing dobiConfig from state');
  const { firebase: fbConfig, pkgDir } = dobiConfig;
  ctx.assert(fbConfig, 500, 'connect: missing firebase from config');
  ctx.assert(pkgDir, 500, 'connect: missing pkgDir from config');

  if (!firebase) {
    firebase = connectFB(fbConfig);
  }

  if (!watcher) {
    watcher = new Watcher({ firebase, pkgDir });
  }
  const { 'user[_id]': userId } = ctx.request.query;
  watcher.setUserId(userId);
  const fileContents = JSON.stringify({
    timestamp: Date.now(),
    user_id: userId,
  }, null, 2);

  await fs.writeFile(USER_CONNECT_PATH, fileContents, 'utf8');
  const packages = {};

  const pkgDirs = await fs.readdir(pkgDir);
  const promises = Object.values(pkgDirs).map(async (id) => {
    packages[id] = {};
    const pkgPath = `${pkgDir}/${id}`;
    try {
      if (!(await fs.lstat(pkgPath)).isDirectory()) {
        return;
      }
      const versions = await fs.readdir(pkgPath);
      for (const version of Object.values(versions)) {
        packages[id][version] = 1;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      ctx.throw(500, `CONNECT WARNING: ${err.toString()}`);
    }
  });

  await Promise.all(promises);
  ctx.body = packages;
};
