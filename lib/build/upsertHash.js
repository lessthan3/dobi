'use strict';

const {
  HASH_PATH,
  asyncWriteFile,
} = require('./utils');

module.exports = async hashes => (
  asyncWriteFile(HASH_PATH, JSON.stringify(hashes, null, 2))
);
