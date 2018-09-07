// dependencies
const bodyParser = require('body-parser');
const cluster = require('cluster');
const cookieParser = require('cookie-parser');
const dobi = require('./server_old');
const errorhandler = require('errorhandler');
const express = require('express');
const http = require('http');
const https = require('https');
const methodOverride = require('method-override');
const pkg = require(path.join('..', 'package'));

// logging
const expressWinston = require('express-winston');
const winston = require('winston');

const transports = [
  new winston.transports.Console({
    colorize: true,
    json: false
  })
];

const logConfig = {
  level: 'info',
  expressFormat: true,
  meta: false,
  transports
};

const requestLogger = expressWinston.logger(logConfig);
const errorLogger = expressWinston.errorLogger(logConfig);

// configuration
const app = express();
app.use(errorhandler({dumpExceptions: true, showStack: true}));
app.use(requestLogger);
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(dobi({
  firebase: config.firebase || null,
  mongodb: config.mongo || null,
  pkg_dir: path.join(workspace, 'pkg'),
  watch: ['0', undefined].includes(process.env.CLUSTER_INDEX)
}));
app.use(errorLogger);

module.exports = app;

// listen
// http
