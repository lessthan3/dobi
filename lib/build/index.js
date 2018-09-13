'use strict';

const buildPackages = require('./buildPackages');
const getConfig = require('./getConfig');
const getPackages = require('./getPackages');
const resetDestDir = require('./resetDestDir');

const { asyncExists } = require('./utils');

module.exports = async () => {
  const { distDir, pkgDir } = await getConfig();
  const pkgDirExists = await asyncExists(pkgDir);
  if (!pkgDirExists) {
    throw new Error('pkg dir does not exist');
  }

  // clear destinationDirectory
  const packageList = await getPackages(pkgDir);
  const distList = await getPackages(distDir);
  await resetDestDir({
    distDir, distList, packageList, pkgDir,
  });
  await buildPackages({ distDir, packageList, pkgDir });
};
