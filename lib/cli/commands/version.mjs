import path from 'path';
import dirname from './dirname';
import { asyncReadFile } from '../../utils';

export default async () => {
  const packageStr = await asyncReadFile(
    path.join(dirname, '..', '..', '..', 'package.json'),
  );
  const pkg = JSON.parse(packageStr);
  return pkg.version;
};
