'use strict';

const wrap = require('dobi-asset-wrap');
const { USE_COMPRESSION } = require('../config');

module.exports = (list, query) => new Promise((resolve, reject) => {
  const css = new wrap.Assets(list, {
    compress: USE_COMPRESSION,
    vars: query,
    vars_prefix: '$',
  }, ((wrapErr) => {
    if (wrapErr) {
      return reject(wrapErr);
    }
    const asset = css.merge((err) => {
      if (err) {
        return reject(err);
      }
      return resolve(asset.data);
    });
    return null;
  }));
  return null;
});
