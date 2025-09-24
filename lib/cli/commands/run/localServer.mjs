import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import path from 'path';
import dobi from '../../../server/index.mjs';
import logger from './logger.mjs';
import { getConfig } from '../../../../utils/getConfig.mjs';

const config = getConfig();

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
