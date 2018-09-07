'use strict';

const CSON = require('season');
const fs = require('fs');
const { IS_PROD } = require('../config');

// read a CSON file amd make sure it exists
module.exports = (file, next) => {
  fs.exists(file, (exists) => {
    if (exists) {
      return CSON.readFile(file, next);
    }

    if (IS_PROD) {
      return next('file does not exists');
    }

    return next(`${file} does not exist`);
  });
};
