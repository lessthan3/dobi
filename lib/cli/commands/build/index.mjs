import path from 'path';
import buildPackages from './buildPackages.mjs';
import getPackages from './getPackages.mjs';
import resetDestDir from './resetDestDir.mjs';
import { asyncExists } from '../../../utils.mjs';
import { CWD } from '../../config.mjs';

export default async (pkgDirStr, distDirStr) => {
  if (!(typeof distDirStr === 'string' && typeof pkgDirStr === 'string')) {
    throw new Error('src-dir and dest-dir required and must be strings');
  }

  const pkgDir = path.resolve(CWD, pkgDirStr);
  const distDir = path.resolve(CWD, distDirStr);

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
