'use strict';

const connect = require('./connect');
const getObjects = require('./getObjects');
const getSiteBySlug = require('./getSiteBySlug');

const getWorkspacePath = require('./getWorkspacePath');
const readUserConfig = require('./readUserConfig');
const saveUserConfig = require('./saveUserConfig');

module.exports = {
  connect,
  getObjects,
  getSiteBySlug,
  getWorkspacePath,
  readUserConfig,
  saveUserConfig,
};
