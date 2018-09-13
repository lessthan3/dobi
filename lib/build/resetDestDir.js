'use strict';

const path = require('path');
const {
  asyncExists,
  asyncMkdirp,
  asyncReaddir,
  asyncRimraf,
} = require('./utils');


module.exports = async ({ distDir, distList, pkgDir }) => {
  const exists = await asyncExists(distDir);
  if (!exists) {
    await asyncMkdirp(distDir);
  }

  const promises = distList.map(async ({ id, version }) => {
    const pkgPath = path.join(pkgDir, id, version);
    const distVersionPath = path.join(distDir, id, version);
    const distPackagePath = path.join(distDir, id);
    const pkgExists = await asyncExists(pkgPath);
    if (!pkgExists) {
      await asyncRimraf(distVersionPath);
      const files = await asyncReaddir(distPackagePath);
      if (files.length === 0) {
        await asyncRimraf(distPackagePath);
      }
    }
  });
  await Promise.all(promises);
};
