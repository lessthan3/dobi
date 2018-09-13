'use strict';

const {
  HASH_PATH,
  asyncExists,
  asyncWriteFile,
} = require('./utils');

module.exports = async () => {
  const exists = await asyncExists(HASH_PATH);
  if (!exists) {
    await asyncWriteFile(HASH_PATH, '{}');
  }
};
