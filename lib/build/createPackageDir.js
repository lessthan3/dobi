'use strict';

const path = require('path');
const {
  asyncExists,
  asyncMkdirp,
} = require('./utils');

module.exports = async ({
  distDir, id, version,
}) => {
  // check if the package directory exists
  const packageDirPath = path.join(distDir, id);
  const packageDirExists = await asyncExists(packageDirPath);
  if (!packageDirExists) {
    await asyncMkdirp(packageDirPath);
  }
  const versionDirPath = path.join(packageDirPath, version);
  const versionDirExists = await asyncExists(versionDirPath);
  if (!versionDirExists) {
    await asyncMkdirp(versionDirPath);
  }
};
