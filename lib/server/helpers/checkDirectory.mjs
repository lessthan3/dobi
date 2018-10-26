import path from 'path';
import { asyncExists, asyncReaddir } from '../../utils';

/**
 * @description get files from directory
 * @param {string} root
 * @param {string} directory
 * @return {Promise<string[]>}
 */
export default async (root, directory) => {
  const directoryPath = path.join(root, directory);
  const exists = await asyncExists(directoryPath);
  if (!exists) {
    return [];
  }
  const files = await asyncReaddir(directoryPath);
  return files.map(file => path.join(root, directory, file));
};
