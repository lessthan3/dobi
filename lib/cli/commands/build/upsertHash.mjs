import fs from 'fs-extra';
import { asyncExists } from '../../../utils';
import { HASH_PATH } from '../../config';

export default async () => {
  const hashExists = await asyncExists(HASH_PATH);
  if (!hashExists) {
    await fs.writeFile(HASH_PATH, '{}');
  }
};
