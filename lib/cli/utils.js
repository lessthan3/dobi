'use strict';

const fs = require('fs');
const colors = require('colors/safe');
const copyDir = require('copy-dir');
const mkdirp = require('mkdirp');
const ncp = require('ncp');
const rimraf = require('rimraf');
const { promisify } = require('util');

const asyncCopyDir = promisify(copyDir);
const asyncMkdirp = promisify(mkdirp);
const asyncNcp = promisify(ncp);
const asyncReaddir = promisify(fs.readdir);
const asyncReadFile = promisify(fs.readFile);
const asyncRimraf = promisify(rimraf);
const asyncStat = promisify(fs.lstat);
const asyncWriteFile = promisify(fs.writeFile);

const log = msg => (
  // eslint-disable-next-line no-console
  console.log(colors.cyan(`[dobi] ${msg}`))
);

const warn = msg => (
  // eslint-disable-next-line no-console
  console.log(colors.red(`[dobi] ${msg}`))
);

const asyncExists = async (itemPath) => {
  try {
    await asyncStat(itemPath);
    return true;
  } catch (err) {
    return false;
  }
};

module.exports = {
  asyncCopyDir,
  asyncExists,
  asyncMkdirp,
  asyncNcp,
  asyncReaddir,
  asyncReadFile,
  asyncRimraf,
  asyncStat,
  asyncWriteFile,
  log,
  warn,
};
