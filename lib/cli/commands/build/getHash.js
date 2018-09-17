'use strict';

const upsertHash = require('./upsertHash');
const { asyncReadFile, asyncWriteFile } = require('./../../utils');
const { HASH_PATH } = require('./../../config');

module.exports = async ({ id, version }) => {
  await upsertHash();
  try {
    const hashes = JSON.parse(await asyncReadFile(HASH_PATH));
    return hashes[`${id}@${version}`];
  } catch (err) {
    await asyncWriteFile(HASH_PATH, '{}');
    return null;
  }
};
