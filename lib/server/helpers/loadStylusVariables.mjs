import path from 'path';
import fs from 'fs-extra';
import { asyncExists } from '../../utils';

/**
 * @description check for style/variables.styl
 * @param {string} root
 * @return {Promise<string>}
 */
export default async (root) => {
  const varsPath = path.join(root, 'style', 'variables.styl');
  const exists = await asyncExists(varsPath);
  if (!exists) {
    return '';
  }

  return fs.readFile(varsPath, 'utf8');
};
