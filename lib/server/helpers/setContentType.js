'use strict';

/**
 * @param {Object} res
 * @param {string} type
 * @return {void}
 */
module.exports = (res, type) => (
  res.set('Content-Type', type)
);
