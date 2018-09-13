'use strict';

const path = require('path');
const {

} = require('./utils');

module.exports = async ({
  data, distDir, id, version,
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
  const jsFilePath = path.join(versionDirPath, 'main.js');
  await asyncWriteFile(jsFilePath, data);
};
