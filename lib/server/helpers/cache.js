'use strict';

const LRU = require('lru-cache');
const parseUrl = require('parseurl');
const { IS_PROD } = require('../config');
const cacheHeaders = require('./cacheHeaders');

const lruCache = new LRU({ max: 50, maxAge: 1000 * 60 * 5 });

/**
 * @description cache middleware
 * @param {Object} _options
 * @param {Function} _fn
 * @return {Function}
 */
module.exports = (_options, _fn) => (req, res, next) => {
  let options = _options;
  let fn = _fn;
  if (!fn) {
    fn = options;
    options = { age: '10 minutes' };
  }

  if (typeof options === 'string') {
    options = { age: options };
  }

  // headers
  cacheHeaders(options.age)(req, res, next);

  // response
  const url = options.qs ? req.url : parseUrl(req).pathname;
  const key = `${req.protocol}://${req.hostname}${url}`;
  if (IS_PROD && lruCache.has(key)) {
    return res.send(lruCache.get(key));
  } if (fn.length === 1) {
    return fn((data) => {
      lruCache.set(key, data);
      return res.send(data);
    });
  }
  return fn(req, res, (data) => {
    lruCache.set(key, data);
    return res.send(data);
  });
};
