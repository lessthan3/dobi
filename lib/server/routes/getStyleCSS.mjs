import gatherCSS from '../gatherCSS';
import wrapCSS from '../wrapCSS';

export default async (ctx) => {
  const { dobiConfig } = ctx.state;
  ctx.assert(dobiConfig, 500, 'connect: missing dobiConfig from state');
  const { firebase: fbConfig, pkgDir } = dobiConfig;
  ctx.assert(fbConfig, 500, 'connect: missing firebase from config');
  ctx.assert(pkgDir, 500, 'connect: missing pkgDir from config');

  const { id, version } = ctx.params;
  const { query } = ctx.request;
  ctx.set('Content-Type', 'text/css');
  // validate input
  for (const value of Object.values(query)) {
    ctx.assert(/^[A-Za-z0-9_+@/\-.#$:;\s[\]]*$/.test(value), 400, 'invalid query parameter');
  }

  try {
    const assets = await gatherCSS([], pkgDir, id, version);
    ctx.body = await wrapCSS(assets, query);
  } catch (err) {
    ctx.throw(400, err);
  }
};
