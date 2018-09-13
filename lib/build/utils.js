'use strict';

const fs = require('fs');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const path = require('path');
const { promisify } = require('util');

const asyncStat = promisify(fs.lstat);
const asyncReadFile = promisify(fs.readFile);
const asyncRimraf = promisify(rimraf);
const asyncMkdirp = promisify(mkdirp);
const asyncReaddir = promisify(fs.readdir);
const asyncWriteFile = promisify(fs.writeFile);

const asyncExists = async (itemPath) => {
  try {
    await asyncStat(itemPath);
    return true;
  } catch (err) {
    return false;
  }
};

const cwd = process.cwd();
const CONFIG_PATH = path.join(cwd, '.dobirc.json');
const HASH_PATH = path.join(cwd, '/.dobihash.json');

module.exports = {
  asyncExists,
  asyncMkdirp,
  asyncReaddir,
  asyncReadFile,
  asyncRimraf,
  asyncStat,
  asyncWriteFile,
  CONFIG_PATH,
  cwd,
  HASH_PATH,
};
