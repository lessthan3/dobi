import { VERBOSE_ERRORS } from '../config.mjs';
import { asyncCsonReadFile, asyncExists } from '../../utils.mjs';

/**
 * @description read a CSON file
 * @param {string} filePath
 * @return {Promise<string>}
 */
export default async (filePath) => {
  const exists = await asyncExists(filePath);
  if (exists) {
    return asyncCsonReadFile(filePath);
  }

  // Show file path in error (disable with DOBI_VERBOSE_ERRORS=false)
  if (VERBOSE_ERRORS) {
    throw new Error(`${filePath} does not exist`);
  }
  throw new Error('file does not exist');
};
