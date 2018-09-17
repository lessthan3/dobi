'use strict';

const assert = require('assert');
const get = require('lodash/get');
const chunk = require('lodash/chunk');
const retry = require('retry-as-promised');
const { connect, getObjects, getSiteBySlug } = require('../helpers');
const { log, warn } = require('../utils');

const destSlugFree = async (destSlug) => {
  try {
    const site = await getSiteBySlug(destSlug);
    if (site) {
      throw new Error('dst_slug already taken');
    }
    return;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return;
    }
    throw new Error(err);
  }
};

const createSiteObjectClone = ({ destSlug, srcSite, user }) => {
  const newSite = {
    ...srcSite,
    _id: undefined,
    created: Date.now(),
    last_modified: Date.now(),
    name: destSlug,
    seo: {},
    settings: {
      ...get(srcSite, 'settings', {}),
      domain: {
        ...get(srcSite, 'settings.domain', {}),
        url: `www.maestro.io/${destSlug}`,
      },
      security: {
        ...get(srcSite, 'settings.security', {}),
        password: '',
      },
      services: {
        ...get(srcSite, 'settings.services', {}),
      },
    },
    slug: destSlug,
    users: {
      ...get(srcSite, 'users', {}),
      [user.admin_uid]: 'admin',
    },
  };

  // clear services
  for (const key of Object.keys(newSite.settings.services)) {
    newSite.settings.services[key] = '';
  }
  return newSite;
};

const insertObjects = async ({ db, destSite, srcObjects }) => {
  // insert new objects
  const idMap = {};
  const destObjects = [];
  const countArr = [];
  const totalObjects = srcObjects.length;

  const srcObjectChunks = chunk(srcObjects, 100);
  for (const srcObjectChunk of srcObjectChunks) {
    const promises = srcObjectChunk.map(async (object) => {
      const srcObj = object.val();
      const { _id: srcId } = srcObj;
      const newObject = {
        ...srcObj,
        _id: undefined,
        created: Date.now(),
        last_modified: Date.now(),
        seo: {},
        site_id: destSite.get('_id').val(),
      };

      const { collection, slug } = newObject;

      await retry(async () => {
        const destObj = await db.get('objects').insert(newObject);
        idMap[srcId] = destObj.get('_id').val();
        destObjects.push(destObj);
      }, {
        max: 40,
        name: `object-insert - ${collection}:${slug}`,
        report: (msg, { $current }) => {
          if ($current > 1) {
            warn(msg);
          }
        },
        timeout: 10000,
      });

      countArr.push(1);
      if ((countArr.length % 10 === 0) || countArr.length === totalObjects) {
        log(`${countArr.length}/${totalObjects} objects inserted`);
      }
    });

    // eslint-disable-next-line no-await-in-loop
    await Promise.all(promises);
  }

  return { destObjects, idMap };
};

const fixSiteReferences = async ({ destSite, idMap }) => {
  let siteString = JSON.stringify(destSite.val());
  let updateSite;
  for (const [srcId, destId] of Object.entries(idMap)) {
    if (!(siteString.indexOf(srcId) > -1)) {
      continue;
    }
    const regex = new RegExp(srcId, 'g');
    siteString = siteString.replace(regex, destId);
    updateSite = true;
  }
  if (!updateSite) {
    return;
  }
  await destSite.set(JSON.parse(siteString));
};

const fixObjectReferences = async ({ destObjects, idMap }) => {
  const totalObjects = destObjects.length;
  const countArr = [];

  const onTick = () => {
    countArr.push(1);
    if ((countArr.length % 10 === 0) || countArr.length === totalObjects) {
      log(`${countArr.length}/${totalObjects} refs updated`);
    }
  };

  const destObjectChunks = chunk(destObjects, 100);

  for (const destObjectChunk of destObjectChunks) {
    const promises = destObjectChunk.map(async (destObj) => {
      const { collection, slug } = destObj.val();
      const dataRef = destObj.get('data');
      let dataString = JSON.stringify(dataRef.val());
      let updateObject;
      for (const [srcId, destId] of Object.entries(idMap)) {
        if (!(dataString.indexOf(srcId) > -1)) {
          continue;
        }
        const regex = new RegExp(srcId, 'g');
        dataString = dataString.replace(regex, destId);
        updateObject = true;
      }

      if (!updateObject) {
        onTick();
        return;
      }

      await retry(async () => {
        await dataRef.set(JSON.parse(dataString));
        onTick();
      }, {
        max: 40,
        name: `object-update - ${collection}:${slug}`,
        report: (msg, { $current }) => {
          if ($current > 1) {
            warn(msg);
          }
        },
        timeout: 10000,
      });
    });

    // eslint-disable-next-line no-await-in-loop
    await Promise.all(promises);
  }
};

module.exports = async (srcSlug, destSlug) => {
  assert(srcSlug && typeof srcSlug === 'string', 'src_slug required');
  assert(destSlug && typeof destSlug === 'string', 'dest_slug required');

  // connect
  const { db, user } = await connect();

  // get source site and check if dest slug is available
  const srcSite = (await getSiteBySlug(srcSlug)).val();
  await destSlugFree(destSlug);

  // get source objects
  const srcObjects = await getObjects(srcSite._id);

  // create new site and insert it
  log('inserting site');
  const newSite = createSiteObjectClone({ destSlug, srcSite, user });
  const destSite = await db.get('sites').insert(newSite);

  // create and insert new site's objects
  log('inserting objects');
  const { destObjects, idMap } = await insertObjects({ db, destSite, srcObjects });

  // update region references and object references
  log('fixing region _id references');
  await fixSiteReferences({ destSite, idMap });

  log('fixing object references');
  await fixObjectReferences({ destObjects, idMap });

  log(`clone successful - https://www.maestro.io/${destSlug}`);
};
