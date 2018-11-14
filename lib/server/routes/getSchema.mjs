import { readSchema } from '../helpers';

export default async (ctx) => {
  const { dobiConfig } = ctx.state;
  ctx.assert(dobiConfig, 500, 'getSchema: missing dobiConfig from state');
  const { pkgDir } = dobiConfig;
  ctx.assert(pkgDir, 500, 'getSchema: missing pkgDir from config');
  const { id, version } = ctx.params;
  ctx.set('Content-Type', 'application/json');
  try {
    ctx.body = await readSchema(pkgDir, id, version);
  } catch (err) {
    ctx.throw(400, err);
  }
};
