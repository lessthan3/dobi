import path from 'path';
import wrap from 'dobi-asset-wrap';
import { asyncExists, asyncLstat } from '../utils';
import {
  checkDirectory, readConfig, readSchema, getPackage,
} from '../helpers';

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
    }
    return source;
  };

  const postprocess = (_source) => {
    let source = _source;
    if (!config.core) {
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

  const asset = new wrap[method]({
    postprocess,
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
    // eslint-disable-next-line no-await-in-loop
    const depAssets = await gatherJS(ignore, pkgDir, depId, depVersion);
    ignore.push([depId, depVersion]);
    for (const asset of depAssets) {
      assets.push(asset);
    }
  }

  // if main.js is null, skip directory
  if (config.main && config.main.js === null) {
    return assets;
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
    // eslint-disable-next-line no-await-in-loop
    const asset = await add(filePath, config, schema);
    if (asset) {
      assets.push(asset);
    }
  }

  return assets;
};

export default gatherJS;
