'use strict';

const { asyncExists, asyncWriteFile } = require('./../../../utils');
const { HASH_PATH } = require('./../../config');

module.exports = async () => {
  const hashExists = await asyncExists(HASH_PATH);
  if (!hashExists) {
    await asyncWriteFile(HASH_PATH, '{}');
  }
};
