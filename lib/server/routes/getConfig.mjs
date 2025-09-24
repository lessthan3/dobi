import { readConfig } from '../helpers/index.mjs';

export default async (ctx) => {
  const { dobiConfig } = ctx.state;
  ctx.assert(dobiConfig, 500, 'connect: missing dobiConfig from state');
  const { pkgDir } = dobiConfig;
  ctx.assert(pkgDir, 500, 'connect: missing pkgDir from config.mjs');

  const { id, version } = ctx.params;
  ctx.assert(id, 'missing id');
  ctx.assert(version, 'missing version');
  ctx.set('Content-Type', 'application/json');

  let config;
  try {
    config = await readConfig(pkgDir, id, version);
  } catch (err) {
    ctx.throw(404, 'config not found');
  }
  ctx.body = config;
};
