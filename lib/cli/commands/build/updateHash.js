'use strict';

const upsertHash = require('./upsertHash');
const { asyncWriteFile, warn } = require('./../../../utils');
const { HASH_PATH } = require('./../../config');

module.exports = async (hashes) => {
  await upsertHash();
  try {
    const obj = {};
    for (const { hash, id, version } of hashes) {
      obj[`${id}@${version}`] = hash;
    }
    await asyncWriteFile(HASH_PATH, JSON.stringify(obj, null, 2));
  } catch (err) {
    warn('error writing hash');
    warn(err.stack);
    await asyncWriteFile(HASH_PATH, '{}');
  }
};
