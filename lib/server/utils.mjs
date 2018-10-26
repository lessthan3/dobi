import fs from 'fs';
import { promisify } from 'util';
import * as colors from 'colors/safe';
import CSON from 'season';

const asyncLstat = promisify(fs.lstat);
const asyncCsonReadFile = promisify(CSON.readFile);
const asyncReaddir = promisify(fs.readdir);
const asyncReadFile = promisify(fs.readFile);
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

export {
  asyncExists,
  asyncLstat,
  asyncCsonReadFile,
  asyncReaddir,
  asyncReadFile,
  asyncStat,
  asyncWriteFile,
  log,
  warn,
};
