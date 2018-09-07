/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS201: Simplify complex destructure assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

'use strict';

// Dependencies
const Firebase = require('firebase');
const LRU = require('lru-cache');
const async = require('async');
const cluster = require('cluster');
const chokidar = require('chokidar');
const express = require('express');
const findit = require('findit');
const fs = require('fs');
const jwt = require('jwt-simple');

const path = require('path');
const wrap = require('dobi-asset-wrap');

const config = require('./config');
const readCSON = require('./utils/readCSON');
const ReadConfig = require('./utils/ReadConfig');

// Apps
const lru_cache = new LRU({ max: 50, maxAge: 1000 * 60 * 5 });
const firebase = new Firebase('https://lessthan3.firebaseio.com');

// const {
//   HOME,
//   HOMEPATH,
//   LT3_ENV
//   USERPROFILE
// } = process.env;
//
// const USER_HOME = HOME || HOMEPATH || USERPROFILE;
// const USER_CONNECT_PATH = `${USER_HOME}/.dobi_connect`;
//
// // Settings
// const IS_PROD = LT3_ENV === 'prod';
// const USE_CACHE = IS_PROD;
// const USE_COMPRESSION = IS_PROD;

const {
  IS_PROD,
  USE_CACHE,
  USE_COMPRESSION,
  USER_CONNECT_PATH,
} = config;

let user_id = null;


// Exports
module.exports = (cfg) => {
  // get the absolute directory of the specified package

  const getPackage = (id, version) => path.join(PKG_DIR, id, version);

  // dependencies dependant on the config
  const readConfig = ReadConfig(PKG_DIR);

  // create a list of Assets for the needed files
  var gatherJS = function (ignore, id, version, next) {
    for (const i of Array.from(ignore)) {
      if ([id, version] === i) { return next(null, []); }
    }

    // read config
    return readConfig(id, version, (err, config) => {
      if (err) { return next(err); }
      return readSchema(id, version, (err, schema) => {
        let id; let
          version;
        if (err) { return next(err); }

        const root = getPackage(id, version);

        // get dependencies
        ignore.push([id, version]);
        if (config.dependencies == null) { config.dependencies = {}; }
        const deps = ((() => {
          const result = [];
          for (id in config.dependencies) {
            version = config.dependencies[id];
            result.push([id, version]);
          }
          return result;
        })());

        return async.map(deps, ((...args) => {
          let callback;
          let id; let
            version;
          [id, version] = Array.from(args[0]), callback = args[1];
          return gatherJS(ignore, id, version, callback);
        }), (err, dep_assets) => {
          if (err) { return next(err); }

          let assets = [];
          for (const a of Array.from(dep_assets)) { assets = assets.concat(a); }

          const add = function (src) {
            let asset; let needle; let
              needle1;
            if (!src) { return; }
            if (!fs.existsSync(src)) { return; }
            if (!fs.lstatSync(src).isFile()) { return; }
            if ((needle = path.extname(src), !['.js', '.coffee'].includes(needle))) { return; }
            if ((needle1 = path.basename(src), ['api.coffee'].includes(needle1))) { return; }
            const name = path.basename(src, '.coffee');

            // new apps
            if (config.core) {
              asset = new wrap.Coffee({
                src,
                preprocess(source) {
                  const pkg = `lt3.pkg['${config.id}']['${config.version}']`;
                  const p = `${pkg}.Presenters['${name}'] extends lt3.presenters`;
                  const t = `${pkg}.Templates['${name}']`;
                  const subs = [
                    ['exports.Collection', `${p}.Collection`],
                    ['exports.Object', `${p}.Object`],
                    ['exports.Page', `${p}.Page`],
                    ['exports.Presenter', `${p}.Presenter`],
                    ['exports.Region', `${p}.Region`],
                    ['exports.Template', `${t}`],
                  ];
                  for (const sub of Array.from(subs)) {
                    source = source.replace(sub[0], sub[1]);
                  }
                  return source;
                },
              });
              asset.pkg_config = config;
              asset.pkg_schema = schema;
              return assets.push(asset);

              // old apps, themes, libraries
            }
            asset = new wrap.Snockets({
              src,
              postprocess(result) {
                const pkg = `lt3.pkg['${config.id}']['${config.version}']`;
                const p = `${pkg}.Presenters['${name}']`;
                const t = `${pkg}.Templates['${name}']`;
                const p2 = `${pkg}.Pages['${name}']`;

                const substitutions = [
                  ['exports.App', `${p} = ${pkg}.App`], // todo: deprecate
                  ['exports.Header', `${p} = ${pkg}.Header`],
                  ['exports.Footer', `${p} = ${pkg}.Footer`],
                  ['exports.Component', `${p} = ${pkg}.Component`], // todo: dep
                  ['exports.Template', `${t}`],
                  ['exports.Page', `${p} = ${p2}`],
                ];
                for (const sub of Array.from(substitutions)) {
                  result = result.replace(sub[0], sub[1]);
                }
                return result;
              },
            });
            asset.pkg_config = config;
            asset.pkg_schema = schema;
            return assets.push(asset);
          };

          // if main.js defined, only load that
          if (config.main != null ? config.main.js : undefined) {
            add(path.join(root, (config.main != null ? config.main.js : undefined) || ''));
            next(null, assets);
            return;
          }

          const checkDirectory = (d, next) => fs.readdir(path.join(root, d), (err, files) => {
            if (files == null) { files = []; }
            for (const f of Array.from(files)) { add(path.join(root, d, f)); }
            return next();
          });

          return checkDirectory('', () => checkDirectory('templates', () => checkDirectory('presenters', () => checkDirectory('views', () => checkDirectory('pages', () => next(null, assets))))));
        });
      });
    });
  };

  const wrapJS = function (list, next) {
    // wrap code
    let js;
    return js = new wrap.Assets(list, {
      compress: USE_COMPRESSION,
    }, ((err) => {
      let asset; let
        header;
      if (err) { return next(err); }

      // generate package header
      try {
        header = '';

        const checked = [];
        const check = function (str, data = null) {
          let result;
          if (checked[str]) { return ''; }
          checked[str] = 1;
          if (data) {
            result = `;${str}=${JSON.stringify(data)};`;
          } else {
            result = `;if(${str}==null){${str}={};};`;
          }
          return result;
        };

        for (asset of Array.from(js.assets)) {
          var s;
          const lt3 = 'window.lt3';
          const pkg = 'lt3.pkg';
          const pkg_id = `lt3.pkg['${asset.pkg_config.id}']`;
          const pkg_id_version = `${pkg_id}['${asset.pkg_config.version}']`;
          const pres = `${pkg_id_version}.Presenters`;
          const tmpl = `${pkg_id_version}.Templates`;
          const page = `${pkg_id_version}.Pages`; // TODO: deprecate

          if (asset.pkg_config.core) {
            for (s of [lt3, pkg, pkg_id, pkg_id_version, pres, tmpl, page]) {
              header += check(s);
            }
            header += check(`${pkg_id_version}.config`, asset.pkg_config);
            header += check(`${pkg_id_version}.schema`, asset.pkg_schema);
          }

          if (['app', 'theme', 'site'].includes(asset.pkg_config.type)) {
            for (s of [lt3, pkg, pkg_id, pkg_id_version, pres, tmpl, page]) {
              header += check(s);
            }
            header += check(`${pkg_id_version}.config`, asset.pkg_config);
            header += check(`${pkg_id_version}.schema`, asset.pkg_schema);
          }
        }
      } catch (error) {
        err = error;
        next(err);
        return;
      }

      // merge assets
      return asset = js.merge(err => next(err, header + asset.data));
    }));
  };

  var gatherCSS = function (ignore, id, version, next) {
    for (const i of Array.from(ignore)) {
      if ([id, version] === i) { return next(null, []); }
    }

    // read config
    return readConfig(id, version, (err, config) => {
      let id; let
        version;
      if (err) { return next(err, null); }
      if (config.pages == null) { config.pages = []; }
      if (config.collections == null) { config.collections = {}; }

      const root = getPackage(id, version);

      // get dependencies
      ignore.push([id, version]);
      if (config.dependencies == null) { config.dependencies = {}; }
      const deps = ((() => {
        const result = [];
        for (id in config.dependencies) {
          version = config.dependencies[id];
          result.push([id, version]);
        }
        return result;
      })());
      return async.map(deps, ((...args) => {
        let callback;
        let id; let
          version;
        [id, version] = Array.from(args[0]), callback = args[1];
        return gatherCSS(ignore, id, version, callback);
      }), (err, dep_assets) => {
        if (err) { return next(err); }

        // check for style/variables.styl
        let variables_code = '';
        const loadVariables = function (next) {
          const vars_path = path.join(root, 'style', 'variables.styl');
          return fs.exists(vars_path, (exists) => {
            if (exists) {
              return fs.readFile(vars_path, 'utf8', (err, data) => {
                variables_code = data;
                return next();
              });
            }
            return next();
          });
        };

        return loadVariables(() => {
          const add = function (src) {
            let asset; let
              needle;
            if (!src) { return; }
            if (!fs.existsSync(src)) { return; }
            if (!fs.lstatSync(src).isFile()) { return; }
            if ((needle = path.extname(src), !['.css', '.styl'].includes(needle))) { return; }
            if (path.basename(src) === 'variables.styl') { return; }

            const ext = path.extname(src);
            if (ext === '.css') {
              asset = new wrap.CSS({ src });
            } else if (ext === '.styl') {
              asset = new wrap.Stylus({
                src,
                preprocess(source) {
                  ({ id } = config);
                  version = config.version.replace(/\./g, '-');
                  const name = path.basename(src, ext);

                  if (config.core) {
                    const p = `.${id}.v${version} .${name}`;
                    const subs = [
                      ['.exports.collection', `${p}.collection`],
                      ['.exports.object', `${p}.object`],
                      ['.exports.page', `${p}.object`],
                      ['.exports.presenter', `${p}.presenter`],
                      ['.exports.region', `${p}.region`],
                    ];
                    for (const sub of Array.from(subs)) {
                      source = source.replace(new RegExp(sub[0], 'g'), sub[1]);
                    }
                  }

                  // ex: html.exports -> html.artist-hq.v3-0-0
                  source = source.replace(/.exports/g, `.${id}.v${version}`);

                  // add variables code
                  return variables_code + source;
                },
              });
            }
            return assets.push(asset);
          };

          var assets = [];
          if (config.main == null) { config.main = { css: 'style.styl' }; }
          if (config.main.css) { add(path.join(root, config.main.css)); }

          const checkDirectory = (d, next) => fs.readdir(path.join(root, d), (err, files) => {
            if (files == null) { files = []; }
            for (const f of Array.from(files)) { add(path.join(root, d, f)); }
            return next();
          });

          return checkDirectory('style', () => {
            for (const a of Array.from(dep_assets)) { assets = assets.concat(a); }

            // sort so that theme.styl and app.styl are first
            // so that they can import fonts
            assets.sort((a, b) => {
              const x = path.basename(a.src);
              const y = path.basename(b.src);
              for (const f of ['imports.styl', 'theme.styl', 'app.styl']) {
                if (x === f) { return -1; }
                if (y === f) { return 1; }
              }
              return 0;
            });
            return next(null, assets);
          });
        });
      });
    });
  };

  const wrapCSS = function (list, query, next) {
    let css;
    return css = new wrap.Assets(list, {
      compress: USE_COMPRESSION,
      vars: query,
      vars_prefix: '$',
    }, ((err) => {
      let asset;
      if (err) { return next(err); }
      return asset = css.merge(err => next(err, asset.data));
    }));
  };

  const cacheHeaders = age => function (req, res, next) {
    let val = 'private, max-age=0, no-cache, no-store, must-revalidate';
    if (USE_CACHE) {
      let [num, type] = Array.from([age, 'seconds']);
      if (typeof age === 'string') {
        [num, type] = Array.from(age.split(' '));
        num = parseInt(num, 10);
      }
      if (num === 0) {
        val = 'private, max-age=0, no-cache, no-store, must-revalidate';
      } else {
        switch (type) {
          case 'minute':
          case 'minutes':
            num *= 60;
            break;
          case 'hour':
          case 'hours':
            num *= 3600;
            break;
          case 'day':
          case 'days':
            num *= 86400;
            break;
          case 'week':
          case 'weeks':
            num *= 604800;
            break;
        }
        val = `public, max-age=${num}, must-revalidate`;
      }
    }
    return res.set('Cache-Control', val);
  };

  let cache = (options, fn) => function (req, res, next) {
    // options
    if (!fn) {
      fn = options;
      options = { age: '10 minutes' };
    }

    if (typeof options === 'string') {
      options = { age: options };
    }

    // headers
    cacheHeaders(options.age)(req, res, next);

    // response
    const url = options.qs ? req.url : req._parsedUrl.pathname;
    const key = `${req.protocol}://${req.hostname}${url}`;
    if (IS_PROD && lru_cache.has(key)) {
      return res.send(lru_cache.get(key));
    } if (fn.length === 1) {
      return fn((data) => {
        lru_cache.set(key, data);
        return res.send(data);
      });
    }
    return fn(req, res, (data) => {
      lru_cache.set(key, data);
      return res.send(data);
    });
  };
  if (cfg.cache_function) { cache = cfg.cache_function; }

  // cache age
  let cache_age = '1 day';
  if (cfg.cache_age) {
    ({ cache_age } = cfg);
  }

  // Watch For File Changes
  if (cfg.watch) {
    // watch for user to connect
    let watcher = chokidar.watch(USER_CONNECT_PATH, {
      ignored() { return false; },
      usePolling: true,
      interval: 5000,
    });

    // watch for package file changes
    watcher = chokidar.watch(PKG_DIR, {
      ignored: /(^\.|\.swp$|\.tmp$|~$)/,
      usePolling: true,
      interval: 2000,
    });
    watcher.on('change', (filepath) => {
      if (!user_id) {
        console.log('USER IS NOT CONNECTED. CAN NOT WATCH FOR UPDATES');
        return;
      }

      filepath = filepath.replace(PKG_DIR, '');
      let [_, id, version, ...file] = Array.from(filepath.split(path.sep));
      file = file.join(path.sep);
      console.log(`${id} v${version} updated`);
      return readConfig(id, version, (err, config) => {
        if (err) { return console.error(err); }
        delete config.changelog;
        const ref = firebase.child(`users/${user_id}/developer/listener`);

        config.modified = {
          time: Date.now(),
          base: path.basename(file),
          ext: path.extname(file).replace('.', ''),
          file,
          name: path.basename(file, path.extname(file)),

          // TODO: deprecate
          file_ext: path.extname(file).replace('.', ''),
          file_name: path.basename(file, path.extname(file)),
        };
        return ref.set(config, (err) => {
          if (err) { return console.error(err); }
        });
      });
    });
  }

  // Middleware
  return function (req, res, next) {
    // Helpers
    const auth = function (req, res, next) {
      const token = (req.query != null ? req.query.token : undefined) || (req.body != null ? req.body.token : undefined);
      if (token && cfg.firebase) {
        try {
          const payload = jwt.decode(token, cfg.firebase.secret);
          req.user = payload.d;
          req.admin = payload.admin;
        } catch (err) {
          req.token_parse_error = err;
        }
      }
      return next();
    };

    const contentType = type => res.set('Content-Type', type);

    const error = function (code, msg) {
      if (!msg) {
        switch (code) {
          case 400:
            msg = 'Bad Request';
            break;
          case 404:
            msg = 'Page Not Found';
            break;
          case 500:
            msg = 'Internal Server Error';
            break;
        }
      }

      console.error(`\

=== ERROR: ${code} ===\
`);
      res.status(code).send(msg);
      return console.error(`\
===
${msg}
=== END ERROR ===
\
`);
    };

    // Routes
    const router = express.Router();

    // Access Control Allow Origin
    router.get('*', (req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      return next();
    });

    // Development Token
    if (!IS_PROD) {
      router.get('/connect', (req, res, next) => {
        const { token } = req.query;
        return firebase.authWithCustomToken(token, (err, data) => {
          if (err) { return error(400); }
          user_id = req.query.user._id;

          // notify watcher
          return fs.writeFile(USER_CONNECT_PATH, JSON.stringify({
            data,
            token,
            user_id,
            timestamp: Date.now(),
          }, null, 2), 'utf8', (err) => {
            if (err) { return console.error(err); }

            // respond to user
            const pkgs = {};
            const object = fs.readdirSync(PKG_DIR);
            for (let i in object) {
              const id = object[i];
              pkgs[id] = {};
              const pkg_path = `${PKG_DIR}/${id}`;
              try {
                if (!fs.lstatSync(pkg_path).isDirectory()) { continue; }
                const object1 = fs.readdirSync(pkg_path);
                for (i in object1) {
                  const version = object1[i];
                  pkgs[id][version] = 1;
                }
              } catch (error1) {
                err = error1;
                console.error('WARNING: ', err);
              }
            }
            return res.send(pkgs);
          });
        });
      });
    }

    // Package Config
    router.get('/pkg/:id/:version/config.json', (req, res, next) => {
      contentType('application/json');
      return cache({ age: cache_age }, (req, res, next) => readConfig(req.params.id, req.params.version, (err, data) => {
        if (err) { return error(400, err); }
        return next(data);
      }))(req, res, next);
    });

    // Package Schema
    router.get('/pkg/:id/:version/schema.json', (req, res, next) => {
      contentType('application/json');
      return cache({ age: cache_age }, (req, res, next) => readSchema(req.params.id, req.params.version, (err, data) => {
        if (err) { return error(400, err); }
        return next(data);
      }))(req, res, next);
    });

    // Package Files
    if (!IS_PROD) {
      router.get('/pkg/:id/:version/files.json', (req, res, next) => {
        contentType('application/json');
        const root = path.join(getPackage(req.params.id, req.params.version));

        const files = [];
        const finder = findit(root);
        finder.on('file', (file, stat) => files.push({
          ext: path.extname(file).replace(/^\./, ''),
          path: file.replace(`${root}${path.sep}`, ''),
        }));
        return finder.on('end', () => res.send(files));
      });
    }

    // Package Single File Reload
    if (!IS_PROD) {
      const partial = function (req, res, next) {
        if (!req.query.file) { return error(400, 'file required'); }

        // grab parameters
        let { id } = req.params;
        let { version } = req.params;
        const { file } = req.query;
        const { ext } = req.params;
        const filepath = path.join(`${getPackage(id, version)}`, file);
        const target_ext = path.extname(filepath);
        const name = path.basename(file, target_ext);

        // make sure file exists
        return fs.exists(filepath, (exists) => {
          let asset;
          if (!exists) {
            if (IS_PROD) {
              return error(404, 'File does not exist');
            }
            return error(404, `File ${file} does not exist`);
          }

          switch (ext) {
            // schema files
            case 'json':
              return readCSON(filepath, (err, data) => {
                if (err) { return error(400, err); }
                contentType('text/javascript');
                const pkg = `lt3.pkg[\"${id}\"][\"${version}\"]`;
                return res.send(`${pkg}.schema[\"${name}\"] = ${JSON.stringify(data)}`);
              });

              // source coffee-script
            case 'coffee':
              return asset = new wrap.Asset({
                src: filepath,
                preprocess(source) {
                  const pkg = `lt3.pkg['${id}']['${version}']`;
                  const p = `${pkg}.Presenters['${name}'] extends lt3.presenters`;
                  const t = `${pkg}.Templates['${name}']`;
                  const subs = [
                    ['exports.Collection', `${p}.Collection`],
                    ['exports.Object', `${p}.Object`],
                    ['exports.Page', `${p}.Page`],
                    ['exports.Presenter', `${p}.Presenter`],
                    ['exports.Region', `${p}.Region`],
                    ['exports.Template', `${t}`],
                  ];
                  for (const sub of Array.from(subs)) {
                    source = source.replace(sub[0], sub[1]);
                  }
                  return source;
                },
              }, ((err) => {
                if (err) { return error(400, err); }
                contentType('text/coffeescript');
                return res.send(asset.data);
              }));

              // presenters and templates
            case 'js':
            case 'js.map':
              return asset = new wrap.Coffee({
                src: filepath,
                source_map: true,
                source_files: [
                  req.url.replace(/(.js.map|.js)/, '.coffee'),
                ],
                generated_file: req.url.replace('.js.map', '.js'),
                preprocess(source) {
                  const pkg = `lt3.pkg['${id}']['${version}']`;
                  const p = `${pkg}.Presenters['${name}'] extends lt3.presenters`;
                  const t = `${pkg}.Templates['${name}']`;
                  const subs = [
                    ['exports.Collection', `${p}.Collection`],
                    ['exports.Object', `${p}.Object`],
                    ['exports.Page', `${p}.Page`],
                    ['exports.Presenter', `${p}.Presenter`],
                    ['exports.Region', `${p}.Region`],
                    ['exports.Template', `${t}`],
                  ];
                  for (const sub of Array.from(subs)) {
                    source = source.replace(sub[0], sub[1]);
                  }
                  return source;
                },
              }, ((err) => {
                if (err) { return error(400, err); }
                contentType('text/javascript');
                if (ext === 'js') {
                  const source_map_url = req.url.replace('.js', '.js.map');
                  res.set('X-SourceMap', source_map_url);
                  return res.send(asset.data);
                } if (ext === 'js.map') {
                  return res.send(asset.v3_source_map);
                }
              }));

              // style files
            case 'css':

              // check for style/variables.styl
              var variables_code = '';
              var root = getPackage(id, version);
              var loadVariables = function (next) {
                const vars_path = path.join(root, 'style', 'variables.styl');
                return fs.exists(vars_path, (exists) => {
                  if (exists) {
                    return fs.readFile(vars_path, 'utf8', (err, data) => {
                      variables_code = data;
                      return next();
                    });
                  }
                  return next();
                });
              };

              return loadVariables(() => asset = new wrap.Stylus({
                src: filepath,
                vars: req.query,
                vars_prefix: '$',
                preprocess(source) {
                  id = id;
                  version = version.replace(/\./g, '-');

                  const p = `.${id}.v${version} .${name}`;
                  const subs = [
                    ['.exports.collection', `${p}.collection`],
                    ['.exports.object', `${p}.object`],
                    ['.exports.page', `${p}.object`],
                    ['.exports.presenter', `${p}.presenter`],
                    ['.exports.region', `${p}.region`],
                  ];
                  for (const sub of Array.from(subs)) {
                    source = source.replace(new RegExp(sub[0], 'g'), sub[1]);
                  }

                  // ex: html.exports -> html.artist-hq.v3-0-0
                  source = source.replace(/.exports/g, `.${id}.v${version}`);

                  // add variables code
                  return variables_code + source;
                },
              }, ((err) => {
                if (err) { return error(400, err); }
                contentType('text/css');
                return res.send(asset.data);
              })));
            default:
              return error(400, 'invalid file type');
          }
        });
      };
      router.get('/pkg/:id/:version/partial.:ext', partial);
      router.get('/pkg/:id/:version/partial.js.map', (req, res, next) => {
        req.params.ext = 'js.map';
        return partial(req, res, next);
      });
    }

    // Package Javascript
    router.get('/pkg/:id/:version/main.js', (req, res, next) => {
      contentType('text/javascript');
      return cache({ age: cache_age }, (req, res, next) => gatherJS([], req.params.id, req.params.version, (err, assets) => {
        if (err) { return error(400, err); }
        return wrapJS(assets, (err, data) => {
          if (err) { return error(400, err); }
          return next(data);
        });
      }))(req, res, next);
    });

    // Package Stylesheet
    router.get('/pkg/:id/:version/style.css', (req, res, next) => {
      contentType('text/css');
      return cache({ age: cache_age, qs: true }, (req, res, next) => gatherCSS([], req.params.id, req.params.version, (err, assets) => {
        if (err) { return error(400, err); }

        // validate input
        for (const k in req.query) {
          const v = req.query[k];
          if (!/^[A-Za-z0-9_+@\/\-\.\#\$:;\s\[\]]*$/.test(v)) {
            return error(400, 'invalid query parameter');
          }
        }

        return wrapCSS(assets, req.query, (err, data) => {
          if (err) { return error(400, err); }
          return next(data);
        });
      }))(req, res, next);
    });

    // Public/Static Files
    router.get('/pkg/:id/:version/public/*', (req, res, next) => {
      const { id } = req.params;
      const { version } = req.params;
      const file = req.params[0];

      // validate input
      if (!/^[A-Za-z0-9+@/_\-\.]+$/.test(file)) {
        return error(400, 'not a valid filename');
      }

      const filepath = path.join(`${getPackage(id, version)}`, 'public', file);
      return fs.exists(filepath, (exists) => {
        if (exists) {
          return res.sendFile(filepath, { maxAge: 1000 * 60 * 5 });
        }
        if (IS_PROD) {
          return error(404, 'File does not exists');
        }
        return error(404, `File ${file} does not exists`);
      });
    });

    // API Calls
    const apiCallHandler = function (req, res, next) {
      const { id } = req.params;
      const method = req.params[0];
      const { version } = req.params;

      const package_path = path.join(`${getPackage(id, version)}`);
      const api_path = path.join(package_path, 'api.coffee');

      // don't cache api.coffee files on dev
      if (!IS_PROD) {
        if (require.cache[api_path]) {
          for (const child of Array.from(require.cache[api_path].children)) {
            delete require.cache[child.id];
          }
          delete require.cache[api_path];
        }
      }

      const svr = require(api_path);
      if (!(svr != null ? svr[method] : undefined)) { return error(404); }

      // pass arguments in as a single argument map
      // also keep that data the scope for backwards compatibility (to deprecate)
      const args = {
        admin: req.admin,
        body: req.body,
        cache(options, fn) { return cache(options, fn)(req, res, next); },
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
    router.get('/pkg/:id/:version/api/*', auth, apiCallHandler);
    router.post('/pkg/:id/:version/api/*', auth, apiCallHandler);

    return router.handle(req, res, next);
  };
};
