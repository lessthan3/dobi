'use strict';

const opn = require('opn');

module.exports = async (...args) => {
  const url = args.reduce((str, arg) => (
    `${str}/${arg}`
  ), 'https://www.maestro.io');
  opn(url);
};
