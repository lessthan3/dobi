import fs from 'fs';
import { promisify } from 'util';
import * as colors from 'colors/safe';
import CSON from 'season';
import mkdirp from 'mkdirp';
import ncp from 'ncp';
import copyDir from 'copy-dir';
import rimraf from 'rimraf';

const { cyan, red } = colors.default;

export const asyncRimraf = promisify(rimraf);
export const asyncMkdirp = promisify(mkdirp);
export const asyncCopyDir = promisify(copyDir);
export const asyncLstat = promisify(fs.lstat);
export const asyncCsonReadFile = promisify(CSON.readFile);
export const asyncReaddir = promisify(fs.readdir);
export const asyncReadFile = promisify(fs.readFile);
export const asyncStat = promisify(fs.lstat);
export const asyncWriteFile = promisify(fs.writeFile);
export const asyncNcp = promisify(ncp);

export const log = msg => (
  // eslint-disable-next-line no-console
  console.log(cyan(`[dobi] ${msg}`))
);

export const warn = msg => (
  // eslint-disable-next-line no-console
  console.log(red(`[dobi] ${msg}`))
);

export const asyncExists = async (itemPath) => {
  try {
    await asyncStat(itemPath);
    return true;
  } catch (err) {
    return false;
  }
};
