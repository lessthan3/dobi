import assert from 'assert';
import fs from 'fs-extra';
import path from 'path';
import CSON from 'season';
import login from './login.mjs';
import dirname from './dirname.js';
import { getWorkspacePath } from '../helpers/index.mjs';
import { asyncMkdirp, asyncNcp, log } from '../../utils.mjs';


export default async (idVersion, type = 'app') => {
  const [id, version] = idVersion.split('@');
  assert(id, 'must specify package id');
  assert(version, 'must specify package version');
  assert(type, 'must specify package type');
  assert(['app', 'plugin', 'library'].includes(type), `invalid type: ${type}`);

  const { user } = await login();
  const source = path.join(dirname, '..', '..', '..', 'bootstrap', type);
  const workspace = await getWorkspacePath();
  const destination = path.join(workspace, 'pkg', id, version);
  try {
    await asyncMkdirp(destination);
    await asyncNcp(source, destination);
  } catch (err) {
    throw new Error(`error creating package: ${err}`);
  }

  const configPath = path.join(destination, 'config.cson');
  const userConfig = {
    ...(CSON.readFileSync(configPath)),
    author: {
      email: user.email,
      name: user.name,
    },
    developers: {
      [user.admin_uid]: 'admin',
    },
    id,
    version,
  };

  const configCson = CSON.stringify(userConfig).replace(/\n\n/g, '\n');
  await fs.writeFile(configPath, configCson);
  log('package created successfully');
};
