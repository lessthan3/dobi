'use strict';

const { saveUserConfig } = require('../helpers');
const { log } = require('../utils');

module.exports = async () => {
  await saveUserConfig({});
  log('you are logged out');
};
