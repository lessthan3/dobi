import fs from 'fs-extra';
import upsertHash from './upsertHash';
import { HASH_PATH } from '../../config';

export default async ({ id, version }) => {
  await upsertHash();
  try {
    const hashes = JSON.parse(await fs.readFile(HASH_PATH, 'utf-8'));
    return hashes[`${id}@${version}`];
  } catch (err) {
    await fs.writeFile(HASH_PATH, '{}');
    return null;
  }
};
