/* eslint-disable no-await-in-loop */

'use strict';

const { exists, readdir } = require('fs');
const path = require('path');
const { promisify } = require('util');
const readCSON = require('./readCSON');

const asyncExists = promisify(exists);
const asyncReaddir = promisify(readdir);

/**
 * @description read all schema files from a direcotory
 * @param {string} root
 * @param {string} dir
 * @param {Object} schema
 * @return {Promise<Object>}
 */
module.exports = async (root, dir, schema) => {
  const filePath = path.join(root, dir);

  // check for models directory
  const fileExists = await asyncExists(filePath);
  if (!fileExists) {
    return null;
  }

  // read in the models
  const directoryContents = await asyncReaddir(filePath);
  const filePaths = directoryContents.map(file => path.join(filePath, file));

  const output = { ...schema };
  for (const file of filePaths) {
    if (path.extname(file) === '.cson') {
      const key = path.basename(file, '.cson');
      try {
        output[key] = await readCSON(file);
      } catch (err) {
        throw new Error([
          `Error reading ${file}`,
          `${err.toString()}`,
          `${JSON.stringify(err.location, null, 2)}`,
        ].join('\n'));
      }
    }
  }

  return output;
};
