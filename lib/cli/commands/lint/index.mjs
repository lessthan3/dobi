import collectFiles from './collectFiles.mjs';
import getPath from './getPath.mjs';
import DobiLint from './dobiLint.mjs';
import { log } from '../../../utils.mjs';

export default async (args) => {
  const { _: commands = [], p: target, s: silentFail } = args;
  const [, ...otherTargets] = commands;
  const lintPaths = await getPath({ otherTargets, target });
  const files = await collectFiles({ lintPaths });

  let success = true;
  for (const file of files) {
    const linter = new DobiLint(file);

    const exitCode = await linter.lint();
    if (exitCode) {
      success = false;
    }
  }

  if (success) {
    return log('Success! These files are lint free.');
  } if (!silentFail) {
    throw new Error([
      '',
      ' ---------------------------------------------- ',
      '|         * * * E P I C    F A I L * * *       |',
      '|                                              |',
      '| Some files failed dobi lint validation.      |',
      '|                                              |',
      ' ---------------------------------------------- ',
      '',
    ].join('\n'));
  }
  return process.exit(1);
};
