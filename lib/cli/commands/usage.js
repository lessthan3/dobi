'use strict';

const columnify = require('columnify');
const { log } = require('./../utils');

const commands = [{
  header: 'backup <site-slug>',
  text: 'backup a site',
}, {
  header: 'build <src-dir> <dest-dir>',
  text: 'build package',
}, {
  header: 'cache:bust <site-slug>',
  text: 'clear the cache for a site',
}, {
  header: 'clone <src-slug> <dst-slug>',
  text: 'clone a site',
}, {
  header: 'create <my-package> <type=app>',
  text: 'create a new package',
}, {
  header: 'docs',
  text: 'open the dobi docs',
}, {
  header: 'help',
  text: 'show usage',
}, {
  header: 'init',
  text: 'initialize a workspace',
}, {
  header: 'lint <id@version> | -p <path>',
  text: 'lint package or -p <path> to lint file/dir',
}, {
  header: 'login',
  text: 'authenticate your user',
}, {
  header: 'logout',
  text: 'deauthenticate your user',
}, {
  header: 'open <site-slug>',
  text: 'open a site',
}, {
  header: 'run',
  text: 'run a development server',
}, {
  header: 'usage',
  text: 'show usage',
}, {
  header: 'version',
  text: 'check your dobi version',
}, {
  header: 'whoami',
  text: 'check your authentication status',
}];

module.exports = async () => (log(`
where <command> [command-specific-options] is one of:
${columnify(commands, {
    columnSplitter: ' | ',
    showHeaders: false,
  })}
`)
);
