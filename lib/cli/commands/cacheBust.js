'use strict';

const assert = require('assert');
const axios = require('axios');
const { connect, getSiteBySlug } = require('../helpers');
const { CACHE_BUST_RESOURCE } = require('../config');
const { log } = require('../utils');

module.exports = async (slug) => {
  assert(slug, 'must specify a site slug');
  const { user: { token } } = await connect();
  const site = await getSiteBySlug(slug);
  try {
    const { data: { host } } = await axios.get(CACHE_BUST_RESOURCE, {
      params: {
        site_id: site.get('_id').val(),
        token,
      },
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
