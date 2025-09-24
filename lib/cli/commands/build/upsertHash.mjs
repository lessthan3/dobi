import fs from 'fs-extra';
import { asyncExists } from '../../../utils.mjs';
import { HASH_PATH } from '../../config.mjs';

export default async () => {
  const hashExists = await asyncExists(HASH_PATH);
  if (!hashExists) {
    await fs.writeFile(HASH_PATH, '{}');
  }
};
