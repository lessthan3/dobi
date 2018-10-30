import assert from 'assert';
import fs from 'fs-extra';
import path from 'path';
import { CWD } from '../config';
import { getObjects, getSiteBySlug } from '../helpers';
import { log } from '../../utils';

export default async (slug) => {
  assert(slug, 'must specifiy site slug');

  // get site and objects
  const site = await getSiteBySlug(slug);
  const objects = await getObjects(site._id.toString());

  // write backup file
  const fileName = `backup-${slug}-${Date.now()}.json`;
  const filePath = path.join(CWD, fileName);
  await fs.writeFile(filePath, JSON.stringify({
    objects: objects.map(object => ({ ...object, _id: object._id.toString() })),
    site,
  }, null, 2));
  log(`backup complete: ${fileName}`);
};
