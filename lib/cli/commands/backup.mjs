import assert from 'assert';
import path from 'path';
import { CWD } from '../config';
import { getObjects, getSiteBySlug } from '../helpers';
import { asyncWriteFile, log } from '../../utils';

export default async (slug) => {
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
