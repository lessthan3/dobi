'use strict';

const path = require('path');
const { CWD } = require('../config');
const { asyncWriteFile, asyncMkdirp, log } = require('../../utils');
const { getWorkspacePath } = require('../helpers');

module.exports = async () => {
  let workspace;
  try {
    workspace = await getWorkspacePath();
  } catch (err) {
    if (err.message !== 'must be in a workspace to create a package') {
      throw err;
    }
  }

  if (workspace) {
    throw new Error(`already in a workspace: ${workspace}`);
  }

  const workspacePath = path.join(CWD, 'dobi.json');
  const pkgPath = path.join(CWD, 'pkg');
  await asyncWriteFile(workspacePath, JSON.stringify({ created: Date.now() }));
  await asyncMkdirp(pkgPath);
  log(`workspace successfully created at: ${CWD}`);
};
