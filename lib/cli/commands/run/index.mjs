import cluster from 'cluster';
import path from 'path';
import os from 'os';
import http from 'http';
import fs from 'fs-extra';
import { CWD } from '../../config';
import { getWorkspacePath } from '../../helpers';
import { log, warn } from '../../../utils';
import dirname from './dirname';
import server from './localServer';

const getPackage = async () => {
  const pkgPath = path.join(dirname, '..', '..', '..', '..', 'package.json');
  const pkgString = await fs.readFile(pkgPath);
  return JSON.parse(pkgString);
};


export default async (...args) => {
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

  http.createServer(server(workspace).callback()).listen(pkg.config.port);
  log(`listening http: ${pkg.config.port}`);
};
