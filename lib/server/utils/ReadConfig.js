/* eslint-disable global-require */

'use strict';

const path = require('path');
const readCSON = require('./readCSON');
const {
  DOBI_DEBUG,
  IS_PROD,
} = require('../config');

// read a full package config
module.exports = PKG_DIR => (id, version, next) => {
  const getPackage = require('./getPackage')(PKG_DIR);
  const root = path.join(getPackage(id, version));
  if (DOBI_DEBUG) {
    // eslint-disable-next-line no-console
    console.log('read', path.join(root, 'config.cson'));
  }
  return readCSON(path.join(root, 'config.cson'), (err, _config) => {
    const config = { ..._config };
    if (err) { return next(err); }

    // remove sensitive information on prod
    if (IS_PROD) {
      delete config.author;
      delete config.changelog;
      delete config.contact;
    }

    return next(null, config);
  });
};
