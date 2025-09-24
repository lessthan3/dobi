

import path from 'path';
import cpFile from 'cp-file';
import ProgressBar from 'progress';
import folderHash from 'folder-hash';
import fs from 'fs-extra';
import gatherJS from '../../../server/gatherJS/index.mjs';
import wrapJS from '../../../server/wrapJS/index.mjs';
import getHash from './getHash.mjs';
import updateHash from './updateHash.mjs';
import createPackageDir from './createPackageDir.mjs';
import upsertMainJs from './upsertMainJs.mjs';
import {
  asyncCopyDir,
  asyncExists,
  asyncRimraf,
} from '../../../utils.mjs';

const { hashElement } = folderHash;

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
  const items = await fs.readdir(sourcePath);
  const promises = items.map(async (item) => {
    const itemSourcePath = path.join(sourcePath, item);
    const itemDestinationPath = path.join(destinationPath, item);

    // don't copy dot files or any files that are part of the js assets
    if (/^\./.test(item) || assetSources.includes(itemSourcePath)) {
      return;
    }
    const stat = await fs.lstat(itemSourcePath);

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


export default async ({ distDir, packageList, pkgDir }) => {
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
      } else {
        await buildPackage({
          distDir, id, pkgDir, version,
        });
        stats.compiled++;
      }
      hashes.push({ hash, id, version });
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

  console.log(`Dobi Build Complete: cached ${cached} - failed ${failed} - compiled ${compiled}`);
  if (failed > 0) {

    console.error('Failed Packages:');
    for (const failedPackage of errors) {

      console.error(failedPackage);
    }
  }
};
