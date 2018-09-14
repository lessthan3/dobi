'use strict';

const buildPackages = require('./buildPackages');
const getPackages = require('./getPackages');
const resetDestDir = require('./resetDestDir');

const { asyncExists } = require('./utils');

module.exports = async ({ distDir, pkgDir }) => {
  const pkgDirExists = await asyncExists(pkgDir);
  if (!pkgDirExists) {
    throw new Error('pkg dir does not exist');
  }

  if (!distDir) {
    throw new Error('distDir required');
  }
  if (!pkgDir) {
    throw new Error('pkgDir required');
  }

  // clear destinationDirectory
  const packageList = await getPackages(pkgDir);
  const distList = await getPackages(distDir);
  await resetDestDir({
    distDir, distList, packageList, pkgDir,
  });
  await buildPackages({ distDir, packageList, pkgDir });
};
