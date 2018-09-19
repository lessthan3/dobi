'use strict';

const assert = require('assert');
const path = require('path');
const CSON = require('season');
const login = require('./login');
const { getWorkspacePath } = require('../helpers');
const {
  asyncMkdirp, asyncNcp, asyncWriteFile, log,
} = require('../../utils');


module.exports = async (idVersion, type = 'app') => {
  const [id, version] = idVersion.split('@');
  assert(id, 'must specify package id');
  assert(version, 'must specify package version');
  assert(type, 'must specify package type');
  assert(['app', 'plugin', 'library'].includes(type), `invalid type: ${type}`);

  const { user } = await login();
  const source = path.join(__dirname, '..', '..', '..', 'bootstrap', type);
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
  await asyncWriteFile(configPath, configCson);
  log('package created successfully');
};
