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

let config = {};
if (fs.existsSync('/u/config/dobi-server.coffee')) {
  config = require('/u/config/dobi-server.coffee');
}

const CWD = process.cwd();
const getWorkspacePathSync = (current = CWD) => {
  if (fs.existsSync(path.join(current, 'dobi.json'))) {
    return current;
  }
  const parent = path.join(current, '..');
  if (parent === current) {
    return current;
  }
  return getWorkspacePathSync(parent);
};
const workspace = getWorkspacePathSync();

// logging

const dobi = require('./server');

const transports = [
  new winston.transports.Console({
    colorize: true,
    json: false,
  }),
];

const logConfig = {
  level: 'info',
  expressFormat: true,
  meta: false,
  transports,
};


const errorLogger = expressWinston.errorLogger(logConfig);

// configuration
const app = express();
app.use(errorhandler({ dumpExceptions: true, showStack: true }));
app.use(requestLogger);
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(dobi({
  firebase: config.firebase || null,
  mongodb: config.mongo || null,
  pkg_dir: path.join(workspace, 'pkg'),
  watch: ['0', undefined].includes(process.env.CLUSTER_INDEX),
}));
app.use(errorLogger);

module.exports = app;

// listen
// http
