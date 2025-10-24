import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import path from 'path';
import dobi from '../../../server/index.mjs';
import logger from './logger.mjs';
import { getConfig } from '../../../../utils/getConfig.mjs';

const errorMiddleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = err.stack ? err.stack.toString() : err.message;
  }
};

export default async (workspace) => {
  const config = await getConfig();
  
  // Use DOBI_PKG_DIR env var if set, otherwise default to 'dist' for built files
  // To use source files directly (slower): DOBI_PKG_DIR=pkg npm start
  const pkgDirName = process.env.DOBI_PKG_DIR || 'dist';
  const pkgDir = path.join(workspace, pkgDirName);
  
  console.log(`[dobi] Using package directory: ${pkgDir}`);
  console.log(`[dobi] To change, set DOBI_PKG_DIR env var (e.g., DOBI_PKG_DIR=pkg)`);
  
  const dobiInstance = dobi({
    firebase: config.firebases.lessthan3.admin,
    pkgDir,
    watch: ['0', undefined].includes(process.env.CLUSTER_INDEX),
  });

  const app = new Koa();
  app.use(errorMiddleware);
  app.use(bodyParser());
  app.use(logger);
  app.use(dobiInstance);

  return app;
};
