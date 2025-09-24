
import chokidar from 'chokidar';
import path from 'path';
import { readConfig } from '../helpers/index.mjs';
import { USER_CONNECT_PATH } from '../config.mjs';

export default class Watcher {
  /**
   * @param {Object} params
   * @param {Object} params.firebase
   * @param {string} params.pkgDir
   */
  constructor({ firebase, pkgDir }) {
    // watch for package file changes
    const watcher = chokidar.watch([USER_CONNECT_PATH, pkgDir], {
      ignored: (filePath) => {
        if (filePath === USER_CONNECT_PATH) {
          return true;
        }
        return /(^\.|\.swp$|\.tmp$|~$)/.test(filePath);
      },
      interval: 2000,
      usePolling: true,
    });
    watcher.on('change', async (_filePath) => {
      if (!this.userId) {
        console.error('USER IS NOT CONNECTED. CAN NOT WATCH FOR UPDATES');
        return null;
      }

      const filePath = _filePath.replace(pkgDir, '');
      const parts = filePath.split(path.sep);
      let [, , , ...file] = parts;
      const [, id, version] = parts;
      file = file.join(path.sep);
      console.log(`${id} v${version} updated`);
      try {
        const config = await readConfig(pkgDir, id, version);
        delete config.changelog;
        const ref = firebase.database().ref(`users/${this.userId}/developer/listener`);

        config.modified = {
          base: path.basename(file),
          ext: path.extname(file).replace('.', ''),
          file,
          file_ext: path.extname(file).replace('.', ''),
          file_name: path.basename(file, path.extname(file)),
          name: path.basename(file, path.extname(file)),
          time: Date.now(),
        };
        await ref.set(config);
        return null;
      } catch (err) {
        return console.error(err);
      }
    });
  }

  setUserId(userId) {
    this.userId = userId;
  }
}
