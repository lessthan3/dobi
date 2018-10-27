import path from 'path';

/**
 * @param {string} pkgDir
 * @param {string} id
 * @param {string} version
 * @return {string}
 */
export default (pkgDir, id, version) => (
  path.join(pkgDir, id, version)
);
