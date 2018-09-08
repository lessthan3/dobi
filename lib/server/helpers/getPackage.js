'use strict';

const path = require('path');

/**
 * @param {string} pkgDir
 * @param {string} id
 * @param {string} version
 * @return {string}
 */
module.exports = (pkgDir, id, version) => (
  path.join(pkgDir, id, version)
);
