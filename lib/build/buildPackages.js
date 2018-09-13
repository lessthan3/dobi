'use strict';

const path = require('path');
const ProgressBar = require('progress');
const { hashElement } = require('folder-hash');
const gatherJS = require('../server/gatherJS');
const wrapJS = require('../server/wrapJS');
const getHash = require('./getHash');
const updateHash = require('./updateHash');
const upsertMainJs = require('./upsertMainJs');
const {
  asyncExists,
} = require('./utils');


module.exports = async ({ distDir, packageList, pkgDir }) => {
  const stats = { cached: 0, compiled: 0, failed: 0 };
  const total = packageList.length;
  const errors = [];
  const bar = new ProgressBar('compiled [:bar] :current/:total :rate/cps :percent :etas', {
    complete: '=',
    incomplete: ' ',
    total,
    width: 50,
  });
  const hashes = [];
  const promises = packageList.map(async ({ dirPath, id, version }) => {
    let hash;
    try {
      const cacheHash = await getHash({ id, version });
      const jsFilePath = path.join(distDir, id, version);
      const jsFileExists = await asyncExists(jsFilePath);
      ({ hash } = await hashElement(dirPath, {
        files: { include: ['*.cson', '*.coffee', '*.css', '*.styl', '*.js', '*.json'] },
      }));
      if (cacheHash === hash && jsFileExists) {
        stats.cached++;
        bar.tick();
        return;
      }
      const assets = await gatherJS([], pkgDir, id, version);
      const data = await wrapJS(assets, true);
      await upsertMainJs({
        data, distDir, id, version,
      });
      hashes.push({ hash, id, version });
      stats.compiled++;
      bar.tick();
    } catch (err) {
      hashes.push({ hash, id, version });
      errors.push(`${id}@${version} - ${err.toString()}\n`);
      stats.failed++;
      bar.tick();
    }
  });
  await Promise.all(promises);
  await updateHash(hashes);
  const { cached, failed, compiled } = stats;
  console.log(`Dobi Build Complete: cached ${cached} - failed ${failed} - compiled ${compiled}`);
  if (failed > 0) {
    console.error('Failed Packages:');
    for (const failedPackage of errors) {
      console.error(failedPackage);
    }
  }
};
