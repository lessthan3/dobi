const path = require('path');
const {
  asyncExists,
  asyncReadFile,
  CONFIG_PATH,
  cwd,
} = require('./utils');

module.exports = async () => {
  const exists = await asyncExists(CONFIG_PATH);
  if (!exists) {
    throw new Error('missing .dobirc.js from package root');
  }
  const config = JSON.parse(await asyncReadFile(CONFIG_PATH, 'utf-8'));
  if (!config.distDir) {
    throw new Error('distDir required');
  }
  if (!config.pkgDir) {
    throw new Error('pkgDir required');
  }
  return {
    distDir: path.join(cwd, config.distDir),
    pkgDir: path.join(cwd, config.pkgDir),
  };
};
