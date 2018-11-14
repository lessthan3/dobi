// Dependencies
import Router from 'koa-router';
import compose from 'koa-compose';
import partial from './partial';
import { IS_PROD } from './config';

import {
  allowCors,
  getPartialMap,
  initState,
} from './middleware';

import {
  connect,
  getConfig,
  getFiles,
  getMainJs,
  getSchema,
  getStaticFiles,
  getStyleCSS,
} from './routes';

const defaultCacheFunction = () => async (ctx, next) => {
  await next();
};

/**
 *
 * @param {Object} config
 * @param {Function} [config.cacheFunction]
 * @param {string} config.cacheAge='1 day'
 * @param {Object} config.firebase
 * @param {string} config.firebase.credential
 * @param {string} config.firebase.databaseURL
 * @param {string} config.pkgDir
 */
export default (config) => {
  const {
    cacheFunction: cache = defaultCacheFunction,
    cacheAge: age = '5 minutes',
  } = config || {};

  // Routes
  const router = new Router();

  // Access Control Allow Origin
  router.use(compose([initState(config), allowCors]));

  // Development Token
  if (!IS_PROD) {
    router.get('/connect', connect);
    router.get('/pkg/:id/:version/files.json', getFiles);
    router.get('/pkg/:id/:version/partial.:ext', partial);
    router.get(
      '/pkg/:id/:version/partial.js.map',
      compose([cache({ age }), getPartialMap]),
      partial,
    );
  }
  router.get('/pkg/:id/:version/config.json', cache({ age }), getConfig);
  router.get('/pkg/:id/:version/schema.json', cache({ age }), getSchema);
  router.get('/pkg/:id/:version/main.js', cache({ age }), getMainJs);
  router.get('/pkg/:id/:version/style.css', cache({ age }), getStyleCSS);

  // Public/Static Files
  router.get('/pkg/:id/:version/public/*', cache({ age }), getStaticFiles);
  return compose([router.routes(), router.allowedMethods()]);
};
