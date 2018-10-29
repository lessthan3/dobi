import fs from 'fs-extra';
import path from 'path';
import { getWorkspacePath } from '../../helpers';
import { asyncExists } from '../../../utils';
import { CWD } from '../../config';

export default async ({ otherTargets, target }) => {
  if (target) {
    const targets = [target, ...otherTargets];
    const promises = targets.map(async (item) => {
      if (typeof item !== 'string') {
        throw new Error('must specify file path');
      }
      const itemPath = path.resolve(CWD, item);
      const itemStat = await fs.lstat(itemPath);
      const type = itemStat.isDirectory() ? 'directory' : 'file';
      return {
        pkgPath: itemPath,
        type,
      };
    });

    return Promise.all(promises);
  }
  const [id, version] = (otherTargets[0] || '').split('@');
  if (!(id && version)) {
    throw new Error('must specify a packageId@packageVersion');
  }

  const workspace = await getWorkspacePath();
  const pkgPath = path.join(workspace, 'pkg', id, version);
  const exists = await asyncExists(pkgPath);
  if (!exists) {
    throw new Error('package not found');
  }
  return [{ pkgPath, type: 'directory' }];
};
