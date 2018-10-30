import assert from 'assert';
import connect from './connect';
import { log } from '../../utils';

export default async (slug = 'deadmau5-testing') => {
  assert(slug, 'must specify a site slug');
  const { db } = await connect();
  const site = await db.collection('sites').findOne({ slug });
  if (!site) {
    throw new Error(`could not find site: ${slug}`);
  }
  log(`site found: ${site._id.toString()}`);
  return {
    ...site,
    _id: site._id.toString(),
  };
};
