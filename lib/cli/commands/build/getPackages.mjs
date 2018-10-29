import fs from 'fs-extra';
import path from 'path';
import { asyncExists } from '../../../utils';

export default async (pkgDir) => {
  const packages = [];
  const dirExists = await asyncExists(pkgDir);
  if (!dirExists) {
    return [];
  }
  const packageIds = await fs.readdir(pkgDir);
  const promises = packageIds.map(async (packageId) => {
    const packagePath = path.join(pkgDir, packageId);
    if (!(await fs.lstat(packagePath)).isDirectory()) {
      return;
    }
    const versions = await fs.readdir(packagePath);
    const promisesB = versions.map(async (version) => {
      const versionPath = path.join(packagePath, version);
      if (!(await fs.lstat(versionPath)).isDirectory()) {
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
