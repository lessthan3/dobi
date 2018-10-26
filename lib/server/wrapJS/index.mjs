import wrap from 'dobi-asset-wrap';
import { USE_COMPRESSION } from '../config';

/**
 *
 * @param {Object} checked
 * @param {string} str
 * @param {Object} data
 * @return {string}
 */
const check = (checked, str, data = null) => {
  let result;
  if (checked[str]) {
    return '';
  }
  // eslint-disable-next-line no-param-reassign
  checked[str] = 1;
  if (data) {
    result = `;${str}=${JSON.stringify(data)};`;
  } else {
    result = `;if(${str}==null){${str}={};};`;
  }
  return result;
};

/**
 * @description wrap js
 * @param {Object[]} list
 * @param {boolean} [forceCompression]
 * @return {Promise<any>}
 */
export default async (list, forceCompression) => {
  const js = new wrap.Assets(list, {
    compress: USE_COMPRESSION || forceCompression,
  });

  await js.wrap();

  let header = '';

  // generate package header
  const checked = [];

  for (const jsAsset of js.assets) {
    const lt3 = 'window.lt3';
    const pkg = 'lt3.pkg';
    const pkgId = `lt3.pkg['${jsAsset.pkg_config.id}']`;
    const pkgIdVersion = `${pkgId}['${jsAsset.pkg_config.version}']`;
    const pres = `${pkgIdVersion}.Presenters`;
    const tmpl = `${pkgIdVersion}.Templates`;
    const page = `${pkgIdVersion}.Pages`; // TODO: deprecate

    if (jsAsset.pkg_config.core) {
      for (const s of [lt3, pkg, pkgId, pkgIdVersion, pres, tmpl, page]) {
        header += check(checked, s);
      }
      header += check(checked, `${pkgIdVersion}.config`, jsAsset.pkg_config);
      header += check(checked, `${pkgIdVersion}.schema`, jsAsset.pkg_schema);
    }

    if (['app', 'theme', 'site'].includes(jsAsset.pkg_config.type)) {
      for (const s of [lt3, pkg, pkgId, pkgIdVersion, pres, tmpl, page]) {
        header += check(checked, s);
      }
      header += check(checked, `${pkgIdVersion}.config`, jsAsset.pkg_config);
      header += check(checked, `${pkgIdVersion}.schema`, jsAsset.pkg_schema);
    }
  }

  // merge assets
  const asset = await js.merge();

  return header + asset.data;
};
