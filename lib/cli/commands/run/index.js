'use strict';


const cluster = require('cluster');
const http = require('http');
const path = require('path');
const os = require('os');
const { CWD } = require('../../config');
const { getWorkspacePath } = require('../../helpers');
const { asyncReadFile, log, warn } = require('../../../utils');
const app = require('./localServer');

const getPackage = async () => {
  const pkgPath = path.join(__dirname, '..', '..', '..', '..', 'package.json');
  const pkgString = await asyncReadFile(pkgPath);
  return JSON.parse(pkgString);
};


module.exports = async (...args) => {
  let workspace;
  if (args[0]) {
    workspace = path.join(CWD, args[0]);
  } else {
    workspace = await getWorkspacePath();
  }

  const pkg = await getPackage();

  cluster.on('listening', (worker) => {
    log(`[${os.hostname}] worker ${worker.process.pid}: server is listening`);
  });
  cluster.on('exit', (worker, code, signal) => {
    if (signal) {
      warn(`killed by signal ${signal}. restarting...`);
    } else {
      warn(`killed by code ${code}. restarting...`);
    }
    cluster.fork();
  });

  const server = app.init(workspace);
  http.createServer(server).listen(pkg.config.port);
  log(`listening http: ${pkg.config.port}`);
};
