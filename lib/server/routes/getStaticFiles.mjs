import path from 'path';
import sendfile from 'koa-sendfile';
import upath from 'upath';
import { asyncExists } from '../../utils';
import { getPackage } from '../helpers';
import { IS_PROD } from '../config';

const { normalizeSafe } = upath;

export default async (ctx) => {
  const { dobiConfig } = ctx.state;
  ctx.assert(dobiConfig, 500, 'getStaticFiles: missing dobiConfig from state');
  const { pkgDir } = dobiConfig;
  ctx.assert(pkgDir, 500, 'getStaticFiles: missing pkgDir from config');
  const { 0: file, id, version } = ctx.params;

  ctx.assert(/^[A-Za-z0-9+@/_\-.]+$/.test(file), 400, 'not a valid filename');
  const root = path.join(`${getPackage(pkgDir, id, version)}`, 'public') + '/';
  const filePath = normalizeSafe(path.join(root, file));
  if (filePath.indexOf(root) !== 0) {
    ctx.throw(404);
    return;
  }
  const exists = await asyncExists(filePath);
  ctx.assert(exists, 404, IS_PROD ? 'File does not exists' : `File ${file} does not exists`);
  await sendfile(ctx, filePath);
};
