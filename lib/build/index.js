const path = require('path');
const ProgressBar = require('progress');
const { hashElement } = require('folder-hash');
const gatherJS = require('../server/gatherJS');
const wrapJS = require('../server/wrapJS');
const getConfig = require('./getConfig');


const {
  asyncStat,
  asyncExists,
  asyncMkdirp,
  asyncReaddir,
  asyncReadFile,
  asyncRimraf,
  asyncWriteFile,
  HASH_PATH,
} = require('./utils');

const upsertHash = async () => {
  const exists = await asyncExists(HASH_PATH);
  if (!exists) {
    await asyncWriteFile(HASH_PATH, '{}');
  }
};

const resetDestDir = async ({ distDir, distList, pkgDir }) => {
  const exists = await asyncExists(distDir);
  if (!exists) {
    await asyncMkdirp(distDir);
  }

  for (const { id, version } of distList) {
    const pkgPath = path.join(pkgDir, id, version);
    const distVersionPath = path.join(distDir, id, version);
    const distPackagePath = path.join(distDir, id);
    const pkgExists = await asyncExists(pkgPath);
    if (!pkgExists) {
      await asyncRimraf(distVersionPath);
      const files = await asyncReaddir(distPackagePath);
      if (files.length === 0) {
        await asyncRimraf(distPackagePath);
      }
    }
  }
};

const getPackages = async (pkgDir) => {
  const packages = [];
  const dirExists = await asyncExists(pkgDir);
  if (!dirExists) {
    return [];
  }
  const packageIds = await asyncReaddir(pkgDir);
  for (const packageId of packageIds) {
    const packagePath = path.join(pkgDir, packageId);
    const versions = await asyncReaddir(packagePath);
    for (const version of versions) {
      const versionPath = path.join(packagePath, version);
      const isDirectory = (await asyncStat(versionPath)).isDirectory();
      if (isDirectory) {
        packages.push({
          dirPath: versionPath,
          id: packageId,
          version,
        });
      }
    }
  }
  return packages;
};

const upsertMainJs = async ({
  data, distDir, id, version,
}) => {
  // check if the package directory exists
  const packageDirPath = path.join(distDir, id);
  const packageDirExists = await asyncExists(packageDirPath);
  if (!packageDirExists) {
    await asyncMkdirp(packageDirPath);
  }
  const versionDirPath = path.join(packageDirPath, version);
  const versionDirExists = await asyncExists(versionDirPath);
  if (!versionDirExists) {
    await asyncMkdirp(versionDirPath);
  }
  const jsFilePath = path.join(versionDirPath, 'main.js');
  await asyncWriteFile(jsFilePath, data);
};

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

const updateHash = async ({ hash, id, version }) => {
  await upsertHash();
  try {
    const hashes = JSON.parse(await asyncReadFile(HASH_PATH));
    hashes[`${id}@${version}`] = hash;
    await asyncWriteFile(HASH_PATH, JSON.stringify(hashes, null, 2));
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
      await updateHash({ hash, id, version });
      stats.compiled++;
      bar.tick();
    } catch (err) {
      await updateHash({ hash, id, version });
      errors.push(`${id}@${version} - ${err.toString()}\n`);
      stats.failed++;
      bar.tick();
    }
  });
  await Promise.all(promises);
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
