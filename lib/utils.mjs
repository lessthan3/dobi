import fs from 'fs-extra';
import { promisify } from 'util';
import * as colors from 'colors/safe.js';
import CSON from 'season';
import mkdirp from 'mkdirp';
import ncp from 'ncp';
import copyDir from 'copy-dir';
import rimraf from 'rimraf';

const { cyan, red } = colors.default;

export const asyncRimraf = promisify(rimraf);
export const asyncMkdirp = promisify(mkdirp);
export const asyncCopyDir = promisify(copyDir);
export const asyncCsonReadFile = promisify(CSON.readFile);
export const asyncNcp = promisify(ncp);

export const log = msg => (

  console.log(cyan(`[dobi] ${msg}`))
);

export const warn = msg => (

  console.log(red(`[dobi] ${msg}`))
);

export const asyncExists = async (itemPath) => {
  try {
    await fs.lstat(itemPath);
    return true;
  } catch (err) {
    return false;
  }
};
