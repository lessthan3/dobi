import path from 'path';
import { asyncExists, asyncReadFile } from '../utils';

export default async ({ id, pkgDir, version }) => {
  const cachePath = path.join(pkgDir, id, version, 'main.js');
  const exists = await asyncExists(cachePath);
  if (exists) {
    return asyncReadFile(cachePath, 'utf-8');
  }
  return false;
};
