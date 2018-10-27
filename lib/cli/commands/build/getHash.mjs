import upsertHash from './upsertHash';
import { asyncReadFile, asyncWriteFile } from '../../../utils';
import { HASH_PATH } from '../../config';

export default async ({ id, version }) => {
  await upsertHash();
  try {
    const hashes = JSON.parse(await asyncReadFile(HASH_PATH));
    return hashes[`${id}@${version}`];
  } catch (err) {
    await asyncWriteFile(HASH_PATH, '{}');
    return null;
  }
};
