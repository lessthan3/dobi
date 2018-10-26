/* eslint-disable no-process-env,global-require,import/no-absolute-path */

// dependencies
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import errorhandler from 'errorhandler';
import express from 'express';
import methodOverride from 'method-override';
import path from 'path';
import winston from 'winston';
import expressWinston from 'express-winston';
import dobi from '../../../server';
import config from '/u/config/dobi-server';

const transports = [
  new winston.transports.Console({
    colorize: true,
    json: false,
  }),
];

const logConfig = {
  expressFormat: true,
  level: 'info',
  meta: false,
  transports,
};

const requestLogger = expressWinston.logger(logConfig);
const errorLogger = expressWinston.errorLogger(logConfig);

const init = (workspace) => {
  const app = express();
  app.use(errorhandler({ dumpExceptions: true, showStack: true }));
  app.use(requestLogger);
  app.use(methodOverride());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(dobi({
    firebase: config.firebases.lessthan3.admin,
    mongodb: config.mongo || {},
    pkgDir: path.join(workspace, 'pkg'),
    watch: ['0', undefined].includes(process.env.CLUSTER_INDEX),
  }));
  app.use(errorLogger);
  return app;
};

export { init };
