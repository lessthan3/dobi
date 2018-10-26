import path from 'path';
import wrap from 'dobi-asset-wrap';
import { asyncExists, asyncLstat } from '../utils';
import {
  checkDirectory,
  getPackage,
  loadStylusVariables,
  readConfig,
} from '../helpers';

const topStyles = ['imports.styl', 'theme.styl', 'app.styl'];

/**
 *
 * @param {string} src
 * @param {string} variablesCode
 * @param {object} config
 * @return {Promise<Object>}
 */
const add = async (src, variablesCode, config) => {
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
  if (!['.css', '.styl'].includes(extension)) {
    return false;
  }

  const basename = path.basename(src);
  if (basename === 'variables.styl') {
    return false;
  }

  if (extension === '.css') {
    asset = new wrap.CSS({ src });
  } else if (extension === '.styl') {
    asset = new wrap.Stylus({
      preprocess: (_source) => {
        let source = _source;
        const { core, id } = config;
        const version = config.version.replace(/\./g, '-');
        const name = path.basename(src, extension);

        if (core) {
          const p = `.${id}.v${version} .${name}`;
          const subs = [
            ['.exports.collection', `${p}.collection`],
            ['.exports.object', `${p}.object`],
            ['.exports.page', `${p}.object`],
            ['.exports.presenter', `${p}.presenter`],
            ['.exports.region', `${p}.region`],
          ];
          for (const [original, replacement] of subs) {
            source = source.replace(new RegExp(original, 'g'), replacement);
          }
        }

        // ex: html.exports -> html.artist-hq.v3-0-0
        source = source.replace(/.exports/g, `.${id}.v${version}`);

        // add variables code
        return variablesCode + source;
      },
      src,
    });
  }
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
const gatherCSS = async (ignore, pkgDir, id, version) => {
  for (const [ignoredId, ignoredVersion] of ignore) {
    if (ignoredId === id && ignoredVersion === version) {
      return [];
    }
  }

  // ignore current package
  ignore.push([id, version]);

  // read config
  const config = await readConfig(pkgDir, id, version);
  const root = getPackage(pkgDir, id, version);

  if (config.pages == null) {
    config.pages = [];
  }
  if (config.collections == null) {
    config.collections = {};
  }

  // get dependencies

  if (config.dependencies == null) {
    config.dependencies = {};
  }
  const assets = [];
  for (const [depId, depVersion] of Object.entries(config.dependencies)) {
    // eslint-disable-next-line no-await-in-loop
    const depAssets = await gatherCSS(ignore, pkgDir, depId, depVersion);
    ignore.push([depId, depVersion]);
    for (const asset of depAssets) {
      assets.push(asset);
    }
  }

  const variablesCode = await loadStylusVariables(root);
  if (config.main == null) {
    config.main = { css: 'style.styl' };
  }
  if (config.main.css) {
    const filePath = path.join(root, config.main.css);
    const asset = await add(filePath, variablesCode, config);
    if (asset) {
      assets.push(asset);
    }
  }

  const filePaths = await checkDirectory(root, 'style');
  for (const filePath of filePaths) {
    // eslint-disable-next-line no-await-in-loop
    const asset = await add(filePath, variablesCode, config);
    if (asset) {
      assets.push(asset);
    }
  }

  // sort so that theme.styl and app.styl are first
  // so that they can import fonts
  return assets.sort((a, b) => {
    const x = path.basename(a.src);
    const y = path.basename(b.src);
    for (const f of topStyles) {
      if (x === f) {
        return -1;
      }
      if (y === f) {
        return 1;
      }
    }
    return 0;
  });
};

export default gatherCSS;
