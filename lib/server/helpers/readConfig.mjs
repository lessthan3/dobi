
import path from 'path';
import readCSON from './readCSON.mjs';
import getPackage from './getPackage.mjs';
import { DOBI_DEBUG, IS_PROD } from '../config.mjs';

/**
 * @description read a full package config
 * @param {string} pkgDir
 * @param {string} id
 * @param {string} version
 * @return {Promise<string>}
 */
export default async (pkgDir, id, version) => {
  const root = path.join(getPackage(pkgDir, id, version));
  const configPath = path.join(root, 'config.cson');
  if (DOBI_DEBUG) {

    console.log('read', configPath);
  }
  const config = await readCSON(configPath);

  // remove sensitive information on prod
  if (IS_PROD) {
    delete config.author;
    delete config.changelog;
    delete config.contact;
  }

  return config;
};
