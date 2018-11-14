/* eslint-disable no-process-env,global-require,import/no-absolute-path */
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import path from 'path';
import dobi from '../../../server';
import logger from './logger';
import config from '/u/config/dobi-server';

const errorMiddleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = err.stack ? err.stack.toString() : err.message;
  }
};

export default (workspace) => {
  const dobiInstance = dobi({
    firebase: config.firebases.lessthan3.admin,
    pkgDir: path.join(workspace, 'pkg'),
    watch: ['0', undefined].includes(process.env.CLUSTER_INDEX),
  });

  const app = new Koa();
  app.use(errorMiddleware);
  app.use(bodyParser());
  app.use(logger);
  app.use(dobiInstance);

  return app;
};
