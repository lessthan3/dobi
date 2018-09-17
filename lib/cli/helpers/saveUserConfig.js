'use strict';

const { USER_CONFIG_PATH } = require('../config');
const { asyncWriteFile } = require('../utils');

/**
 * @param {Object} data
 */
module.exports = async (data) => {
  try {
    await asyncWriteFile(USER_CONFIG_PATH, JSON.stringify(data), 'utf8');
    return data;
  } catch (err) {
    throw new Error(`unable to write user config: ${err.toString()}`);
  }
};
