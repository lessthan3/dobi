'use strict';

const path = require('path');

const {
  asyncExists,
  asyncReaddir,
  asyncStat,
} = require('./utils');

module.exports = async (pkgDir) => {
  const packages = [];
  const dirExists = await asyncExists(pkgDir);
  if (!dirExists) {
    return [];
  }
  const packageIds = await asyncReaddir(pkgDir);
  for (const packageId of packageIds) {
    const packagePath = path.join(pkgDir, packageId);
    const versions = await asyncReaddir(packagePath);
    for (const version of versions) {
      const versionPath = path.join(packagePath, version);
      const isDirectory = (await asyncStat(versionPath)).isDirectory();
      if (isDirectory) {
        packages.push({
          dirPath: versionPath,
          id: packageId,
          version,
        });
      }
    }
  }
  return packages;
};
