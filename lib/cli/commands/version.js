'use strict';

const path = require('path');
const { asyncReadFile } = require('../../utils');

module.exports = async () => {
  const packageStr = await asyncReadFile(
    path.join(__dirname, '..', '..', '..', 'package.json'),
  );
  const pkg = JSON.parse(packageStr);
  return pkg.version;
};
