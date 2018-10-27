import path from 'path';
import readConfig from './readConfig';
import readSchemaDirectory from './readSchemaDirectory';
import getPackage from './getPackage';

/**
 * @description read package sche
 * @param {string} pkgDir
 * @param {string} id
 * @param {string} version
 * @return {Promise<string>}
 */
export default async (pkgDir, id, version) => {
  // get the absolute directory of the specified package

  const root = path.join(getPackage(pkgDir, id, version));
  const config = await readConfig(pkgDir, id, version);

  // TODO (remove): backwards compatibility
  let schema = {};
  if (config.pages && !config.core) {
    schema = config.pages;
  }
  if (config.settings) {
    schema = config.settings;
  }

  const modelFiles = await readSchemaDirectory(root, 'models', schema);
  const schemaFiles = await readSchemaDirectory(root, 'schema', schema);

  return {
    ...modelFiles,
    ...schemaFiles,
  };
};
