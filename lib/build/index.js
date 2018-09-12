const path = require('path');
const gatherJS = require('../server/gatherJS');
const wrapJS = require('../server/wrapJS');
const getConfig = require('./getConfig');
const { hashElement } = require('folder-hash');

const {
  asyncStat,
  asyncExists,
  asyncMkdirp,
  asyncReaddir,
  asyncReadFile,
  asyncRimraf,
  asyncWriteFile,
  HASH_PATH,
  cwd,
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
    console.log(err);
    await asyncWriteFile(HASH_PATH, '{}');
  }
};

const buildPackages = async ({ distDir, packageList, pkgDir }) => {
  let count = 0;
  const total = packageList.length;
  for (const { dirPath, id, version } of packageList) {
    count++;
    let hash;
    try {
      const cacheHash = await getHash({ id, version });
      ({ hash } = await hashElement(dirPath, {
        files: { include: ['*.cson', '*.coffee', '*.css', '*.styl', '*.js', '*.json'] },
      }));
      if (cacheHash === hash) {
        // console.log(`${count}/${total} cached - ${id}@${version}`);
        continue;
      }
      const assets = await gatherJS([], pkgDir, id, version);
      const data = await wrapJS(assets);
      await upsertMainJs({
        data, distDir, id, version,
      });
      await updateHash({ hash, id, version });
      console.log(`${count}/${total} compiled - ${id}@${version}`);
    } catch (err) {
      console.error(`build fail: ${id}@${version}`);
      await updateHash({ hash, id, version });
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
