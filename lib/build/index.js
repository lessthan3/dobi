const path = require('path');
const ProgressBar = require('progress');
const { hashElement } = require('folder-hash');
const gatherJS = require('../server/gatherJS');
const wrapJS = require('../server/wrapJS');
const getConfig = require('./getConfig');
const getPackages = require('./getPackages');
const resetDestDir = require('./resetDestDir');
const upsertHash = require('./upsertHash');


const {
  asyncExists,
  asyncMkdirp,
  asyncReadFile,
  asyncWriteFile,
  HASH_PATH,
} = require('./utils');

const getHash = async ({ id, version }) => {
  await upsertHash();
  try {
    const hashes = JSON.parse(await asyncReadFile(HASH_PATH));
    return hashes[`${id}@${version}`];
  } catch (err) {
    await asyncWriteFile(HASH_PATH, '{}');
    return null;
  }
};

const updateHash = async (hashes) => {
  await upsertHash();
  try {
    const obj = {};
    for (const { hash, id, version } of hashes) {
      obj[`${id}@${version}`] = hash;
    }
    await asyncWriteFile(HASH_PATH, JSON.stringify(obj, null, 2));
  } catch (err) {
    await asyncWriteFile(HASH_PATH, '{}');
  }
};

const buildPackages = async ({ distDir, packageList, pkgDir }) => {
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

module.exports = async () => {
  const { distDir, pkgDir } = await getConfig();
  const pkgDirExists = await asyncExists(pkgDir);
  if (!pkgDirExists) {
    throw new Error('pkg dir does not exist');
  }

  // clear destinationDirectory
  const packageList = await getPackages(pkgDir);
  const distList = await getPackages(distDir);
  await resetDestDir({
    distDir, distList, packageList, pkgDir,
  });
  await buildPackages({ distDir, packageList, pkgDir });
};
