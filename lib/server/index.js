'use strict';

// Dependencies
const Firebase = require('firebase');
const express = require('express');
const findit = require('findit');
const fs = require('fs');
const jwt = require('jwt-simple');
const path = require('path');
const { promisify } = require('util');

const Watcher = require('./Watcher');
const partial = require('./partial');
const gatherJS = require('./gatherJS');
const wrapJS = require('./wrapJS');
const gatherCSS = require('./gatherCSS');
const wrapCSS = require('./wrapCSS');
const { IS_PROD, USER_CONNECT_PATH } = require('./config');
const {
  cache: defaultCache,
  error,
  getPackage,
  readConfig,
  readSchema,
  setContentType,
} = require('./helpers');

const asyncExists = promisify(fs.exists);
const firebase = new Firebase('https://lessthan3.firebaseio.com');

const asyncWrapper = fn => (req, res, next) => {
  fn(req, res, next).catch((err) => {
    if (!err.statusCode) {
      // eslint-disable-next-line no-console
      console.error(err.stack);
      return res.sendStatus(500);
    }
    return res.status(err.statusCode).send(err.message);
  });
};

// Helpers
const authHelper = firebaseSecret => (req, res, next) => {
  const token = req.query.token || req.body.token;
  if (token && firebaseSecret) {
    try {
      const payload = jwt.decode(token, firebaseSecret);
      req.user = payload.d;
      req.admin = payload.admin;
    } catch (err) {
      req.token_parse_error = err;
    }
  }
  return next();
};

// Exports
module.exports = (config) => {
  const {
    cache_function: cache = defaultCache,
    cache_age: cacheAge = '1 day',
    pkg_dir: PKG_DIR,
    firebase: {
      secret: firebaseSecret,
    } = {},
  } = config;

  // Watch For File Changes
  let watcher;
  if (config.watch) {
    watcher = new Watcher({ firebase, pkgDir: PKG_DIR });
  }

  // init auth helper
  const auth = authHelper(firebaseSecret);

  // routes

  const allowCORS = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    return next();
  };

  const devConnect = (req, res) => {
    const {
      token,
      user_id: userId,
    } = req.query;
    return firebase.authWithCustomToken(token, (authErr, data) => {
      if (authErr) {
        return error(res, 400, authErr);
      }

      watcher.setUserId(userId);

      const fileContents = JSON.stringify({
        data,
        timestamp: Date.now(),
        token,
        user_id: userId,
      }, null, 2);

      // notify watcher
      return fs.writeFile(USER_CONNECT_PATH, fileContents, 'utf8', (writeErr) => {
        if (writeErr) {
          // eslint-disable-next-line no-console
          return console.error(writeErr);
        }

        // respond to user
        const packages = {};
        for (const id of Object.values(fs.readdirSync(PKG_DIR))) {
          packages[id] = {};
          const pkgPath = `${PKG_DIR}/${id}`;
          try {
            if (!fs.lstatSync(pkgPath).isDirectory()) {
              continue;
            }
            for (const version of Object.values(fs.readdirSync(pkgPath))) {
              packages[id][version] = 1;
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('WARNING: ', err);
          }
        }
        return res.send(packages);
      });
    });
  };

  const getConfig = async (req, res, next) => {
    const { id, version } = req.params;
    setContentType(res, 'application/json');
    return cache({ age: cacheAge }, async (_req, _res, _next) => {
      const data = await readConfig(PKG_DIR, id, version);
      return _next(data);
    })(req, res, next);
  };

  const getSchema = async (req, res, next) => {
    const { id, version } = req.params;
    setContentType(res, 'application/json');
    return cache({ age: cacheAge }, async (_req, _res, _next) => {
      const data = await readSchema(PKG_DIR, id, version);
      return _next(data);
    })(req, res, next);
  };

  const getFiles = (req, res) => {
    const { id, version } = req.params;
    setContentType(res, 'application/json');
    const root = path.join(getPackage(PKG_DIR, id, version));

    const files = [];
    const finder = findit(root);
    finder.on('file', file => files.push({
      ext: path.extname(file).replace(/^\./, ''),
      path: file.replace(`${root}${path.sep}`, ''),
    }));
    return finder.on('end', () => res.send(files));
  };

  const getPartialJsMap = async (req, res, next) => {
    req.params.ext = 'js.map';
    return partial(PKG_DIR)(req, res, next);
  };


  const getMainJs = async (req, res, next) => {
    const { id, version } = req.params;
    setContentType(res, 'text/javascript');

    return cache({ age: cacheAge }, async (_req, _res, _next) => {
      try {
        const assets = await gatherJS([], PKG_DIR, id, version);
        const data = await wrapJS(assets);
        return _next(data);
      } catch (err) {
        return error(_res, 400, err);
      }
    })(req, res, next);
  };

  const getStyleCSS = async (req, res, next) => {
    const { params: { id, version }, query } = req;
    setContentType(res, 'text/css');
    return cache({ age: cacheAge, qs: true }, async (_req, _res, _next) => {
      // validate input
      for (const value of Object.values(query)) {
        if (!/^[A-Za-z0-9_+@/\-.#$:;\s[\]]*$/.test(value)) {
          return error(_res, 400, 'invalid query parameter');
        }
      }

      try {
        const assets = await gatherCSS([], PKG_DIR, id, version);
        const data = await wrapCSS(assets, query);
        return _next(data);
      } catch (err) {
        return error(_res, 400, err);
      }
    })(req, res, next);
  };

  const getStaticFiles = async (req, res) => {
    const {
      0: file,
      id,
      version,
    } = req.params;

    // validate input
    if (!/^[A-Za-z0-9+@/_\-.]+$/.test(file)) {
      return error(res, 400, 'not a valid filename');
    }

    const filePath = path.join(`${getPackage(PKG_DIR, id, version)}`, 'public', file);
    const exists = await asyncExists(filePath);
    if (exists) {
      return res.sendFile(filePath, { maxAge: 1000 * 60 * 5 });
    }
    if (IS_PROD) {
      return error(res, 404, 'File does not exists');
    }
    return error(res, 404, `File ${file} does not exists`);
  };

  // API Calls
  const apiCallHandler = (req, res, next) => {
    const {
      0: method,
      id,
      version,
    } = req.params;

    const packagePath = path.join(`${getPackage(PKG_DIR, id, version)}`);
    const apiPath = path.join(packagePath, 'api.coffee');

    // don't cache api.coffee files on dev
    if (!IS_PROD) {
      if (require.cache[apiPath]) {
        for (const child of Array.from(require.cache[apiPath].children)) {
          delete require.cache[child.id];
        }
        delete require.cache[apiPath];
      }
    }

    // eslint-disable-next-line global-require,import/no-dynamic-require
    const svr = require(apiPath);
    if (!(svr != null ? svr[method] : undefined)) {
      return error(res, 404);
    }

    // pass arguments in as a single argument map
    // also keep that data the scope for backwards compatibility (to deprecate)
    const args = {
      admin: req.admin,
      body: req.body,
      cache: (options, fn) => cache(options, fn)(req, res, next),
      db: req.db,
      error,
      method: req.method,
      mongofb: req.mongofb,
      next,
      query: req.query,
      req,
      res,
      user: req.user,
    };
    return svr[method].apply(args, [args]);
  };

  // Middleware
  return (req, res, next) => {
    // Routes
    const router = express.Router();

    // Access Control Allow Origin
    router.get('*', allowCORS);

    // Development Token
    if (!IS_PROD) {
      router.get('/connect', devConnect);
    }

    // Package Config
    router.get('/pkg/:id/:version/config.json', asyncWrapper(getConfig));

    // Package Schema
    router.get('/pkg/:id/:version/schema.json', asyncWrapper(getSchema));

    // Package Files
    if (!IS_PROD) {
      router.get('/pkg/:id/:version/files.json', getFiles);
    }

    // Package Single File Reload
    if (!IS_PROD) {
      router.get('/pkg/:id/:version/partial.:ext', asyncWrapper(partial(PKG_DIR)));
      router.get('/pkg/:id/:version/partial.js.map', asyncWrapper(getPartialJsMap));
    }

    // Package Javascript
    router.get('/pkg/:id/:version/main.js', asyncWrapper(getMainJs));

    // Package Stylesheet
    router.get('/pkg/:id/:version/style.css', asyncWrapper(getStyleCSS));

    // Public/Static Files
    router.get('/pkg/:id/:version/public/*', asyncWrapper(getStaticFiles));

    // API Calls
    router.get('/pkg/:id/:version/api/*', auth, apiCallHandler);
    router.post('/pkg/:id/:version/api/*', auth, apiCallHandler);

    return router.handle(req, res, next);
  };
};
