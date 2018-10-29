import fs from 'fs-extra';
import upsertHash from './upsertHash';
import { warn } from '../../../utils';
import { HASH_PATH } from '../../config';

export default async (hashes) => {
  await upsertHash();
  try {
    const sortedHashes = hashes.sort((a, b) => {
      const keyA = `${a.id}@${a.version}`;
      const keyB = `${b.id}@${b.version}`;
      if (keyA > keyB) {
        return 1;
      } if (keyA < keyB) {
        return -1;
      }
      return 0;
    });
    const hashMap = sortedHashes.reduce((obj, { hash, id, version }) => ({
      ...obj,
      [`${id}@${version}`]: hash,
    }), {});
    await fs.writeFile(HASH_PATH, JSON.stringify(hashMap, null, 2));
  } catch (err) {
    warn('error writing hash');
    warn(err.stack);
    await fs.writeFile(HASH_PATH, '{}');
  }
};
