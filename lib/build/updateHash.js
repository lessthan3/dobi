'use strict';

const upsertHash = require('./upsertHash');
const {
  HASH_PATH,
  asyncWriteFile,
} = require('./utils');

module.exports = async (hashes) => {
  await upsertHash();
  try {
    const obj = {};
    for (const { hash, id, version } of hashes) {
      obj[`${id}@${version}`] = hash;
    }
    await asyncWriteFile(HASH_PATH, JSON.stringify(obj, null, 2));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('error writing hash');
    // eslint-disable-next-line no-console
    console.error(err.stack);
    await asyncWriteFile(HASH_PATH, '{}');
  }
};
