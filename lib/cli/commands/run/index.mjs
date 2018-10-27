import cluster from 'cluster';
import http from 'http';
import path from 'path';
import os from 'os';
import { CWD } from '../../config';
import { getWorkspacePath } from '../../helpers';
import { asyncReadFile, log, warn } from '../../../utils';
import dirname from './dirname';
import { init } from './localServer';

const getPackage = async () => {
  const pkgPath = path.join(dirname, '..', '..', '..', '..', 'package.json');
  const pkgString = await asyncReadFile(pkgPath);
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

  const server = init(workspace);
  http.createServer(server).listen(pkg.config.port);
  log(`listening http: ${pkg.config.port}`);
};
