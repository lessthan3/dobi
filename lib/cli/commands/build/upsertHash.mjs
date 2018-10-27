import { asyncExists, asyncWriteFile } from '../../../utils';
import { HASH_PATH } from '../../config';

export default async () => {
  const hashExists = await asyncExists(HASH_PATH);
  if (!hashExists) {
    await asyncWriteFile(HASH_PATH, '{}');
  }
};
