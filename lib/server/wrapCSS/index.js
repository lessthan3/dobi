'use strict';

const wrap = require('dobi-asset-wrap');
const { USE_COMPRESSION } = require('../config');

module.exports = async (list, query) => {
  const css = new wrap.Assets(list, {
    compress: USE_COMPRESSION,
    vars: query,
    vars_prefix: '$',
  });

  await css.wrap();
  const asset = await css.merge();
  return asset.data;
};
