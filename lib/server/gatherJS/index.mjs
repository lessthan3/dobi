import path from 'path';
import wrap from 'dobi-asset-wrap';
import fs from 'fs-extra';
import { asyncExists } from '../../utils.mjs';
import {
  checkDirectory, readConfig, readSchema, getPackage,
} from '../helpers/index.mjs';

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
    console.log(`[gatherJS:add] SKIP: No src provided for ${config.id}@${config.version}`);
    return false;
  }

  const exists = await asyncExists(src);
  if (!exists) {
    console.log(`[gatherJS:add] SKIP: File does not exist: ${src} (${config.id}@${config.version})`);
    return false;
  }

  const fileStat = await fs.lstat(src);
  if (!fileStat.isFile()) {
    console.log(`[gatherJS:add] SKIP: Not a file: ${src} (${config.id}@${config.version})`);
    return false;
  }

  const extension = path.extname(src);
  if (!['.js', '.coffee'].includes(extension)) {
    console.log(`[gatherJS:add] SKIP: Invalid extension ${extension}: ${src} (${config.id}@${config.version})`);
    return false;
  }

  const basename = path.basename(src);
  if (basename === 'api.coffee') {
    console.log(`[gatherJS:add] SKIP: api.coffee excluded: ${src} (${config.id}@${config.version})`);
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
  console.log(`[gatherJS:add] ✓ ADDED: ${src} (${config.id}@${config.version})`);
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
  console.log(`[gatherJS] → Processing: ${id}@${version}`);
  
  for (const [ignoredId, ignoredVersion] of ignore) {
    if (ignoredId === id && ignoredVersion === version) {
      console.log(`[gatherJS] ✗ SKIPPED (already in ignore list): ${id}@${version}`);
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
  const depCount = Object.keys(config.dependencies).length;
  if (depCount > 0) {
    console.log(`[gatherJS] Processing ${depCount} dependencies for ${id}@${version}:`, Object.keys(config.dependencies));
  }
  
  for (const [depId, depVersion] of Object.entries(config.dependencies)) {
    console.log(`[gatherJS]   ↳ Dependency: ${depId}@${depVersion}`);
    const depAssets = await gatherJS(ignore, pkgDir, depId, depVersion);
    ignore.push([depId, depVersion]);
    console.log(`[gatherJS]   ← Dependency ${depId}@${depVersion} returned ${depAssets.length} assets`);
    for (const asset of depAssets) {
      assets.push(asset);
    }
  }

  // if main.js is null, skip directory
  if (config.main && config.main.js === null) {
    console.log(`[gatherJS] main.js is null for ${id}@${version}, returning ${assets.length} dependency assets only`);
    return assets;
  }

  // if main.js defined, only load that
  if (config.main && config.main.js) {
    console.log(`[gatherJS] main.js defined for ${id}@${version}: ${config.main.js}`);
    const filePath = path.join(root, config.main.js);
    const asset = await add(filePath, config, schema);
    if (asset) {
      assets.push(asset);
      console.log(`[gatherJS] ✓ Completed ${id}@${version}: ${assets.length} total assets (main.js mode)`);
    } else {
      console.log(`[gatherJS] ✗ Failed to add main.js for ${id}@${version}, returning ${assets.length} dependency assets`);
    }
    return assets;
  }

  // get package files
  console.log(`[gatherJS] No main.js specified for ${id}@${version}, scanning directories:`, directories);
  const filePathGroups = await Promise.all(directories.map(dir => (
    checkDirectory(root, dir)
  )));

  const filePaths = filePathGroups.reduce((arr, filePathGroup) => [
    ...arr,
    ...filePathGroup,
  ], []);
  
  console.log(`[gatherJS] Found ${filePaths.length} files in directories for ${id}@${version}`);

  for (const filePath of filePaths) {

    const asset = await add(filePath, config, schema);
    if (asset) {
      assets.push(asset);
    }
  }

  console.log(`[gatherJS] ✓ Completed ${id}@${version}: ${assets.length} total assets`);
  return assets;
};

export default gatherJS;
