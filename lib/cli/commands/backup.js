'use strict';

const assert = require('assert');
const path = require('path');
const { CWD } = require('../config');
const { getObjects, getSiteBySlug } = require('../helpers');
const { asyncWriteFile, log } = require('../../utils');

module.exports = async (slug) => {
  assert(slug, 'must specifiy site slug');

  // get site and objects
  const site = await getSiteBySlug(slug);
  const objects = await getObjects(site.get('_id').val());

  // write backup file
  const fileName = `backup-${slug}-${Date.now()}.json`;
  const filePath = path.join(CWD, fileName);
  await asyncWriteFile(filePath, JSON.stringify({
    objects: objects.map(object => object.val()),
    site: site.val(),
  }, null, 2));
  log(`backup complete: ${fileName}`);
};
