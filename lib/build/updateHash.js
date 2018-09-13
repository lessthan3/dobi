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
    await asyncWriteFile(HASH_PATH, '{}');
  }
};
