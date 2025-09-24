

import path from 'path';
import fs from 'fs-extra';
import readCSON from './readCSON.mjs';
import { asyncExists } from '../../utils.mjs';

/**
 * @description read all schema files from a direcotory
 * @param {string} root
 * @param {string} dir
 * @param {Object} schema
 * @return {Promise<Object>}
 */
export default async (root, dir, schema) => {
  const filePath = path.join(root, dir);

  // check for models directory
  const fileExists = await asyncExists(filePath);
  if (!fileExists) {
    return null;
  }

  // read in the models
  const directoryContents = await fs.readdir(filePath);
  const filePaths = directoryContents.map(file => path.join(filePath, file));

  const output = { ...schema };
  for (const file of filePaths) {
    if (path.extname(file) === '.cson') {
      const key = path.basename(file, '.cson');
      try {
        output[key] = await readCSON(file);
      } catch (err) {
        throw new Error([
          `Error reading ${file}`,
          `${err.toString()}`,
          `${JSON.stringify(err.location, null, 2)}`,
        ].join('\n'));
      }
    }
  }

  return output;
};
