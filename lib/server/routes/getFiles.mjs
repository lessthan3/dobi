import path from 'path';
import findit from 'findit';
import { getPackage } from '../helpers/index.mjs';

export default async (ctx) => {
  const { dobiConfig } = ctx.state;
  ctx.assert(dobiConfig, 500, 'getFiles: missing dobiConfig from state');
  const { pkgDir } = dobiConfig;
  ctx.assert(pkgDir, 500, 'getFiles: missing pkgDir from config.mjs');

  const { id, version } = ctx.params;
  ctx.set('Content-Type', 'application/json');
  const root = path.join(getPackage(pkgDir, id, version));

  const files = [];
  const asyncFinder = () => new Promise((resolve, reject) => {
    const finder = findit(root);
    finder.on('file', file => files.push({
      ext: path.extname(file).replace(/^\./, ''),
      path: file.replace(`${root}${path.sep}`, ''),
    }));
    finder.on('error', err => reject(err));
    finder.on('end', () => resolve(files));
  });
  try {
    ctx.body = await asyncFinder();
  } catch (err) {
    ctx.throw(400, err);
  }
};
