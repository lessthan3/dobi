'use strict';

const path = require('path');
const fs = require('fs');
const wrap = require('dobi-asset-wrap');
const { promisify } = require('util');
const {
  checkDirectory,
  readConfig,
  readSchema,
  getPackage,
} = require('../helpers');


const asyncExists = promisify(fs.exists);
const asyncLstat = promisify(fs.lstat);

const directories = [
  '',
  'templates',
  'presenters',
  'views',
  'pages',
];

/**
 * @description add asset
 * @param {string} src
 * @param {Object} config
 * @param {Object} schema
 * @return {Promise<*>}
 */
const add = async (src, config, schema) => {
  let asset;
  if (!src) {
    return false;
  }

  const exists = await asyncExists(src);
  if (!exists) {
    return false;
  }

  const fileStat = await asyncLstat(src);
  if (!fileStat.isFile()) {
    return false;
  }

  const extension = path.extname(src);
  if (!['.js', '.coffee'].includes(extension)) {
    return false;
  }

  const basename = path.basename(src);
  if (basename === 'api.coffee') {
    return false;
  }

  const name = path.basename(src, '.coffee');

  const preprocess = (_source) => {
    let source = _source;
    if (config.core) {
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
      for (const [original, replacement] of subs) {
        source = source.replace(original, replacement);
      }
    } else {
      const pkg = `lt3.pkg['${config.id}']['${config.version}']`;
      const p = `${pkg}.Presenters['${name}']`;
      const t = `${pkg}.Templates['${name}']`;
      const p2 = `${pkg}.Pages['${name}']`;

      const subs = [
        ['exports.App', `${p} = ${pkg}.App`], // todo: deprecate
        ['exports.Header', `${p} = ${pkg}.Header`],
        ['exports.Footer', `${p} = ${pkg}.Footer`],
        ['exports.Component', `${p} = ${pkg}.Component`], // todo: dep
        ['exports.Template', `${t}`],
        ['exports.Page', `${p} = ${p2}`],
      ];
      for (const [original, replacement] of subs) {
        source = source.replace(original, replacement);
      }
    }
    return source;
  };

  let method;
  if (extension === '.js') {
    method = 'Javascript';
  } else {
    method = 'Coffee';
  }

  asset = new wrap[method]({
    preprocess,
    src,
  });
  asset.pkg_config = { ...config };
  asset.pkg_schema = { ...schema };
  return asset;
};

/**
 * @description create a list of Assets for the needed files
 * @param {string[][]} ignore
 * @param {string} pkgDir
 * @param {string} id
 * @param {string} version
 * @return {[]}
 */
const gatherJS = async (ignore, pkgDir, id, version) => {
  for (const [ignoredId, ignoredVersion] of ignore) {
    if (ignoredId === id && ignoredVersion === version) {
      return [];
    }
  }


  ignore.push([id, version]);

  // read config
  const config = await readConfig(pkgDir, id, version);
  const schema = await readSchema(pkgDir, id, version);
  const root = await getPackage(pkgDir, id, version);

  // get dependencies
  if (config.dependencies == null) {
    config.dependencies = {};
  }
  const assets = [];
  for (const [depId, depVersion] of Object.entries(config.dependencies)) {
    const depAssets = await gatherJS(ignore, pkgDir, depId, depVersion);
    ignore.push([depId, depVersion]);
    for (const asset of depAssets) {
      assets.push(asset);
    }
  }

  // if main.js defined, only load that
  if (config.main && config.main.js) {
    const filePath = path.join(root, config.main.js);
    const asset = await add(filePath, config, schema);
    if (asset) {
      assets.push(asset);
    }
    return assets;
  }

  // get package files
  const filePathGroups = await Promise.all(directories.map(dir => (
    checkDirectory(root, dir)
  )));

  const filePaths = filePathGroups.reduce((arr, filePathGroup) => [
    ...arr,
    ...filePathGroup,
  ], []);

  for (const filePath of filePaths) {
    const asset = await add(filePath, config, schema);
    if (asset) {
      assets.push(asset);
    }
  }

  return assets;
};

module.exports = gatherJS;
