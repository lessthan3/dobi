
import path from 'path';
import readCSON from './readCSON.mjs';
import getPackage from './getPackage.mjs';
import { DOBI_DEBUG, STRIP_SENSITIVE_CONFIG } from '../config.mjs';

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

  // Remove sensitive information (enable with DOBI_STRIP_SENSITIVE_CONFIG=true)
  if (STRIP_SENSITIVE_CONFIG) {
    delete config.author;
    delete config.changelog;
    delete config.contact;
  }

  return config;
};
