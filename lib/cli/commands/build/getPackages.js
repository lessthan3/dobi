'use strict';

const path = require('path');

const {
  asyncExists,
  asyncReaddir,
  asyncStat,
} = require('./../../../utils');

module.exports = async (pkgDir) => {
  const packages = [];
  const dirExists = await asyncExists(pkgDir);
  if (!dirExists) {
    return [];
  }
  const packageIds = await asyncReaddir(pkgDir);
  const promises = packageIds.map(async (packageId) => {
    const packagePath = path.join(pkgDir, packageId);
    if (!(await asyncStat(packagePath)).isDirectory()) {
      return;
    }
    const versions = await asyncReaddir(packagePath);
    const promisesB = versions.map(async (version) => {
      const versionPath = path.join(packagePath, version);
      if (!(await asyncStat(versionPath)).isDirectory()) {
        return;
      }
      packages.push({
        dirPath: versionPath,
        id: packageId,
        version,
      });
    });

    await Promise.all(promisesB);
  });

  await Promise.all(promises);
  return packages;
};
