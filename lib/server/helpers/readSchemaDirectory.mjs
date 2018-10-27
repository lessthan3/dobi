/* eslint-disable no-await-in-loop */

import path from 'path';
import readCSON from './readCSON';
import { asyncExists, asyncReaddir } from '../../utils';

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
  const directoryContents = await asyncReaddir(filePath);
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
