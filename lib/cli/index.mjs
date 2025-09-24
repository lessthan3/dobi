import MINIMIST from 'minimist';
import camelCase from 'lodash/camelCase.js';
import * as commands from './commands/index.mjs';
import { warn } from '../utils.mjs';

const minimist = MINIMIST(process.argv.slice(2));

const run = async () => {
  const { _: argv } = minimist;
  // this.minimist = minimist;
  const [command, ...args] = argv;

  if (!command) {
    throw new Error('command required. run dobi usage for commands.');
  }

  const transformedCommand = camelCase(command.replace(/:/g, '_'));


  if (!commands[transformedCommand]) {
    throw new Error(`invalid command: ${command}. run dobi usage for commands.`);
  }

  if (transformedCommand === 'lint') {
    await commands[transformedCommand].apply(null, [minimist]);
  } else {
    await commands[transformedCommand].apply(null, args);
  }


  return command;
};

run()
  .then((command) => {
    if (command !== 'run') {
      process.exit();
    }
  })
  .catch((err) => {
    warn(err.stack ? err.stack.toString() : err.toString());
    process.exit(1);
  });
