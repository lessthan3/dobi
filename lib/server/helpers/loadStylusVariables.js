'use strict';

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const asyncExists = promisify(fs.exists);
const asyncReadFile = promisify(fs.readFile);

/**
 * @description check for style/variables.styl
 * @param {string} root
 * @return {Promise<string>}
 */
module.exports = async (root) => {
  const varsPath = path.join(root, 'style', 'variables.styl');
  const exists = await asyncExists(varsPath);
  if (!exists) {
    return '';
  }

  return asyncReadFile(varsPath, 'utf8');
};
