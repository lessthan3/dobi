'use strict';

const path = require('path');
const cpFile = require('cp-file');
const ProgressBar = require('progress');
const { hashElement } = require('folder-hash');
const gatherJS = require('../server/gatherJS');
const wrapJS = require('../server/wrapJS');
const getHash = require('./getHash');
const updateHash = require('./updateHash');
const createPackageDir = require('./createPackageDir');
const upsertMainJs = require('./upsertMainJs');
const {
  asyncCopyDir,
  asyncExists,
  asyncReaddir,
  asyncRimraf,
  asyncStat,
} = require('./utils');

const coffeeDirectories = ['templates', 'presenters', 'views', 'pages'];

const buildPackage = async ({
  distDir, id, pkgDir, version,
}) => {
  const sourcePath = path.join(pkgDir, id, version);
  const destinationPath = path.join(distDir, id, version);
  const configPath = path.join(pkgDir, id, version, 'config.cson');
  const configExists = await asyncExists(configPath);

  // clear directory
  const destinationExists = await asyncExists(destinationPath);
  if (destinationExists) {
    await asyncRimraf(destinationPath);
  }

  let assets = [];
  // if config, build main.js
  if (configExists) {
    assets = await gatherJS([], pkgDir, id, version);
    const data = await wrapJS(assets, true);
    await createPackageDir({ distDir, id, version });
    await upsertMainJs({
      data, distDir, id, version,
    });
  } else {
    await createPackageDir({ distDir, id, version });
  }

  // copy non-coffee directories and api and utils.coffee
  const assetSources = assets.map(({ src }) => src);
  const items = await asyncReaddir(sourcePath);
  const promises = items.map(async (item) => {
    const itemSourcePath = path.join(sourcePath, item);
    const itemDestinationPath = path.join(destinationPath, item);

    // don't copy dot files or any files that are part of the js assets
    if (/^\./.test(item) || assetSources.includes(itemSourcePath)) {
      return;
    }
    const stat = await asyncStat(itemSourcePath);

    // if directory and not a coffee dir, continue
    if (stat.isDirectory() && !coffeeDirectories.includes(item)) {
      await asyncCopyDir(itemSourcePath, itemDestinationPath);

    // copy any files in root
    } else if (stat.isFile()) {
      await cpFile(itemSourcePath, itemDestinationPath);
    }
  });

  await Promise.all(promises);
};

const initProgressBar = total => (
  new ProgressBar('[:bar] :etas :current/:total :rate pkgs/sec', {
    complete: '=',
    incomplete: ' ',
    total,
    width: 30,
  })
);


module.exports = async ({ distDir, packageList, pkgDir }) => {
  const stats = { cached: 0, compiled: 0, failed: 0 };
  const [errors, hashes] = [[], []];
  const progressBar = initProgressBar(packageList.length);
  const promises = packageList.map(async ({ dirPath, id, version }) => {
    // create hash of directory contents for caching
    const { hash } = await hashElement(dirPath, {
      files: { exclude: ['.*'] },
    });

    try {
      const cacheHash = await getHash({ id, version });
      const destinationPath = path.join(distDir, id, version);
      const packageExists = await asyncExists(destinationPath);

      // don't compile if the package hash hasn't changed and its already compiled
      if (cacheHash === hash && packageExists) {
        stats.cached++;
        progressBar.tick();
        return;
      }

      await buildPackage({
        distDir, id, pkgDir, version,
      });

      hashes.push({ hash, id, version });
      stats.compiled++;
      progressBar.tick();
    } catch (err) {
      hashes.push({ hash, id, version });
      errors.push(`${id}@${version}\n${err.stack}`);
      stats.failed++;
      progressBar.tick();
    }
  });
  await Promise.all(promises);

  // update hash file
  await updateHash(hashes);

  // print result stats
  const { cached, failed, compiled } = stats;
  // eslint-disable-next-line no-console
  console.log(`Dobi Build Complete: cached ${cached} - failed ${failed} - compiled ${compiled}`);
  if (failed > 0) {
    // eslint-disable-next-line no-console
    console.error('Failed Packages:');
    for (const failedPackage of errors) {
      // eslint-disable-next-line no-console
      console.error(failedPackage);
    }
  }
};
