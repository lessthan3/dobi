import { IS_PROD } from '../config';
import { asyncCsonReadFile, asyncExists } from '../../utils';

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

  if (IS_PROD) {
    throw new Error('file does not exist');
  } else {
    throw new Error(`${filePath} does not exist`);
  }
};
