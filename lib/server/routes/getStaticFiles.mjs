import path from 'path';
import sendfile from 'koa-sendfile';
import { asyncExists } from '../../utils';
import { getPackage } from '../helpers';
import { IS_PROD } from '../config';

export default async (ctx) => {
  const { dobiConfig } = ctx.state;
  ctx.assert(dobiConfig, 500, 'getStaticFiles: missing dobiConfig from state');
  const { pkgDir } = dobiConfig;
  ctx.assert(pkgDir, 500, 'getStaticFiles: missing pkgDir from config');
  const { 0: file, id, version } = ctx.params;

  ctx.assert(!IS_PROD, 404, 'File does not exists');
  ctx.assert(/^[A-Za-z0-9+@/_\-.]+$/.test(file), 400, 'not a valid filename');
  const filePath = path.join(`${getPackage(pkgDir, id, version)}`, 'public', file);
  const exists = await asyncExists(filePath);
  ctx.assert(exists, 404, `File ${file} does not exists`);
  await sendfile(ctx, filePath);
};
