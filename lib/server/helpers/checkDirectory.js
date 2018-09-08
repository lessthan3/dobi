'use strict';

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const asyncReaddir = promisify(fs.readdir);

/**
 * @description get files from directory
 * @param {string} root
 * @param {string} directory
 * @return {Promise<string[]>}
 */
module.exports = async (root, directory) => {
  const directoryPath = path.join(root, directory);
  const files = await asyncReaddir(directoryPath);
  return files.map(file => path.join(root, directory, file));
};
