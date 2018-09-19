'use strict';

const assert = require('assert');
const connect = require('./connect');
const { log } = require('../../utils');

module.exports = async (slug = 'deadmau5-testing') => {
  assert(slug, 'must specify a site slug');
  const { db } = await connect();
  const site = await db.get('sites').findOne({ slug });
  if (!site) {
    throw new Error(`could not find site: ${slug}`);
  }
  log(`site found: ${site.get('_id').val()}`);
  return site;
};
