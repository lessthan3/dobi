'use strict';

const {
  HASH_PATH,
  asyncExists,
  asyncWriteFile,
} = require('./utils');

module.exports = async () => {
  const hashExists = await asyncExists(HASH_PATH);
  if (!hashExists) {
    await asyncWriteFile(HASH_PATH, '{}');
  }
};
