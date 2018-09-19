/* eslint-disable no-process-env,global-require,import/no-absolute-path */

'use strict';

require('coffeescript/register');

// dependencies
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const errorhandler = require('errorhandler');
const fs = require('fs');
const express = require('express');
const methodOverride = require('method-override');
const path = require('path');
const winston = require('winston');
const expressWinston = require('express-winston');
const dobi = require('../../../server');

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
  let config = {};
  if (fs.existsSync('/u/config/dobi-server.coffee')) {
    config = require('/u/config/dobi-server.coffee');
  }

  const app = express();
  app.use(errorhandler({ dumpExceptions: true, showStack: true }));
  app.use(requestLogger);
  app.use(methodOverride());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(dobi({
    firebase: config.firebases.lessthan3.client,
    mongodb: config.mongo || {},
    pkgDir: path.join(workspace, 'pkg'),
    watch: ['0', undefined].includes(process.env.CLUSTER_INDEX),
  }));
  app.use(errorLogger);
  return app;
};

module.exports = { init };
