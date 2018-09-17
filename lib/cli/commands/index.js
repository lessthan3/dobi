'use strict';

const backup = require('./backup');
const build = require('./build');
const cacheBust = require('./cacheBust');
const clone = require('./clone');
const create = require('./create');
const docs = require('./docs');
const help = require('./help');
const init = require('./init');
const lint = require('./lint');
const login = require('./login');
const logout = require('./logout');
const open = require('./open');
const run = require('./run');
const usage = require('./usage');
const version = require('./version');
const whoami = require('./whoami');

module.exports = {
  backup,
  build,
  cacheBust,
  clone,
  create,
  docs,
  help,
  init,
  lint,
  login,
  logout,
  open,
  run,
  usage,
  version,
  whoami,
};
