'use strict';

const CSON = require('season');
const fs = require('fs');
const { promisify } = require('util');
const { IS_PROD } = require('../config');

const asyncCsonReadFile = promisify(CSON.readFile);
const asyncExists = promisify(fs.exists);

/**
 * @description read a CSON file
 * @param {string} filePath
 * @return {Promise<string>}
 */
module.exports = async (filePath) => {
  const exists = await asyncExists(filePath);
  if (exists) {
    return asyncCsonReadFile(filePath);
  }

  if (IS_PROD) {
    throw new Error('file does not exist');
  } else {
    throw new Error(`${filePath} does not exist`);
  }
};
