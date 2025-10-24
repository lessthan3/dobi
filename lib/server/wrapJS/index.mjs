import wrap from 'dobi-asset-wrap';
import { USE_COMPRESSION } from '../config.mjs';

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
  console.log(`[wrapJS] Received ${list.length} assets to wrap`);
  for (const asset of list) {
    const pkgInfo = asset.pkg_config ? `${asset.pkg_config.id}@${asset.pkg_config.version}` : 'unknown';
    console.log(`[wrapJS]   - Asset from ${pkgInfo}: ${asset.src || 'no src'}`);
  }
  
  const js = new wrap.Assets(list, {
    compress: USE_COMPRESSION || forceCompression,
  });

  await js.wrap();
  
  console.log(`[wrapJS] After wrap(), ${js.assets.length} assets in js.assets`);

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
  
  const finalOutput = header + asset.data;
  console.log(`[wrapJS] Final output: header=${header.length} chars, asset.data=${asset.data.length} chars, total=${finalOutput.length} chars`);
  console.log(`[wrapJS] Checking for jQuery in output: ${finalOutput.includes('jQuery') ? 'FOUND' : 'NOT FOUND'}`);
  console.log(`[wrapJS] Checking for jquery string in output: ${finalOutput.toLowerCase().includes('jquery') ? 'FOUND' : 'NOT FOUND'}`);

  return finalOutput;
};
