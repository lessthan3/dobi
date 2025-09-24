import path from 'path';
import fs from 'fs-extra';
import * as dirname from './dirname.js';
import { log } from '../../utils.mjs';

export default async () => {
  const packageStr = await fs.readFile(
    path.join(dirname, '..', '..', '..', 'package.json'),
    'utf-8',
  );
  const pkg = JSON.parse(packageStr);
  log(pkg.version);
};
