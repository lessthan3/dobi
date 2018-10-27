import assert from 'assert';
import { log } from '../../utils';
import connect from './connect';

const PAGE_LIMIT = 1000;

const getObjects = async ({
  db, page = 0, results = [], siteId,
}) => {
  log(`fetching page ${page + 1} of objects`);
  const objects = await db.get('objects').find({
    site_id: siteId,
  }, {}, {
    limit: PAGE_LIMIT,
    skip: page * PAGE_LIMIT,
  });
  if (objects.length < PAGE_LIMIT) {
    return results.concat(objects);
  }
  return getObjects({
    db,
    page: page + 1,
    results: results.concat(objects),
    siteId,
  });
};

export default async (siteId) => {
  assert(siteId, 'siteId required');
  const { db } = await connect();
  const objects = await getObjects({
    db,
    siteId,
  });
  log(`${objects.length} objects found`);
  return objects;
};
