'use strict';

const { USE_CACHE } = require('../config');

/**
 *
 * @param {string} age
 * @return {Void}
 */
module.exports = age => (req, res) => {
  let val = 'private, max-age=0, no-cache, no-store, must-revalidate';
  if (USE_CACHE) {
    let [num, type] = [age, 'seconds'];
    if (typeof age === 'string') {
      [num, type] = age.split(' ');
      num = parseInt(num, 10);
    }
    if (num === 0) {
      val = 'private, max-age=0, no-cache, no-store, must-revalidate';
    } else {
      switch (type) {
        case 'minute':
        case 'minutes':
          num *= 60;
          break;
        case 'hour':
        case 'hours':
          num *= 3600;
          break;
        case 'day':
        case 'days':
          num *= 86400;
          break;
        case 'week':
        case 'weeks':
          num *= 604800;
          break;
        default:
          break;
      }
      val = `public, max-age=${num}, must-revalidate`;
    }
  }
  res.set('Cache-Control', val);
};
