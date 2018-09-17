'use strict';

const { asyncExists, asyncReadFile } = require('../utils');
const saveUserConfig = require('./saveUserConfig');
const { USER_CONFIG_PATH } = require('../config');

module.exports = async () => {
  const exists = await asyncExists(USER_CONFIG_PATH);
  if (exists) {
    try {
      const data = await asyncReadFile(USER_CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      throw new Error(`unable to read user config: ${err.toString()}`);
    }
  }
  return saveUserConfig({});
};
