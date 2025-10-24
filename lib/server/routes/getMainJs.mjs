import path from 'path';
import fs from 'fs-extra';
import gatherJS from '../gatherJS/index.mjs';
import wrapJS from '../wrapJS/index.mjs';


export default async (ctx) => {
  const { dobiConfig, log } = ctx.state;
  ctx.assert(dobiConfig, 500, 'getSchema: missing dobiConfig from state');
  ctx.assert(log, 500, 'getSchema: missing log from config.mjs');
  const { pkgDir } = dobiConfig;
  ctx.assert(pkgDir, 500, 'getSchema: missing pkgDir from config.mjs');
  const { id, version } = ctx.params;

  ctx.set('Content-Type', 'text/javascript');
  let data;
  try {
    // Always try to read from pre-built file first
    const cachePath = path.join(pkgDir, id, version, 'main.js');
    const exists = await fs.exists(cachePath);
    log(`[getMainJs] cachePath: ${cachePath} | exists? ${exists}`);
    
    if (exists) {
      // Use pre-built file if available
      data = await fs.readFile(cachePath, 'utf-8');
      log(`[getMainJs] Served pre-built file for ${id}@${version}`);
    } else {
      // Build on-demand if file doesn't exist (fallback for development)
      log(`[getMainJs] Pre-built file not found, building on-demand for ${id}@${version}`);
      const assets = await gatherJS([], pkgDir, id, version);
      data = await wrapJS(assets);
    }
  } catch (err) {
    ctx.throw(400, err);
  }
  ctx.assert(data, 404);
  ctx.body = data;
};
