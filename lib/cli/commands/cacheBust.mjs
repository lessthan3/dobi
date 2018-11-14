import assert from 'assert';
import axios from 'axios';
import { connect, getSiteBySlug } from '../helpers';
import { CACHE_BUST_RESOURCE } from '../config';
import { log } from '../../utils';

export default async (slug) => {
  assert(slug, 'must specify a site slug');
  const { user: { token } } = await connect();
  const site = await getSiteBySlug(slug);
  try {
    const { data: { host } } = await axios.post(CACHE_BUST_RESOURCE, {
      site_id: site._id.toString(),
      token,
    });
    log(`cache has been cleared for ${host}`);
  } catch (err) {
    if (err.response) {
      throw new Error(`${err.response.status}: ${err.response.data}`);
    } else {
      throw new Error(err);
    }
  }
};
