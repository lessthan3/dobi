**v1.7.2** (2014-11-17

 - fix connect/updates for clustered dev
 - update chokidar to 0.11

**v1.7.1** (2014-11-17)

 - allow developer to not have a config file yet

**v1.7.0** (2014-11-17)

 - allow custom cache age for js/css
 - bump version on chokidar depedency
 - cluster on dobi run for dev

**v1.6.9** (2014-08-21)

 - file update fix for windows because of path separator
 - preprocess partial coffee files

**v1.6.8** (2014-08-17)

 - added source maps for coffee -> js partials

**v1.6.7** (2014-08-10)

 - fix .exports replacement for partial stylesheet loads

**v1.6.6** (2014-08-10)

 - clone bug fix

**v1.6.5** (2014-08-10)

 - watch out for bad args on dobi lint

**v1.6.4** (2014-08-10)

 - add logout command

**v1.6.3** (2014-08-10)

 - fix bug with create command
 - fix login bug

**v1.6.2** (2014-08-10)

 - cache unauthorized cache clears

**v1.6.1** (2014-08-10)

 - remove prefix slash from files.json paths

**v1.6.0** (2014-08-10)

 - add files.json dev server api call

**v1.5.4** (2014-08-01)

 - use firebase safe uids

**v1.5.3** (2014-07-30)

 - shortcut req.db and req.method on api calls

**v1.5.2** (2014-07-30)

 - have cache bust use live api instead of local

**v1.5.1** (2014-07-29)

 - add cache:bust

**v1.5.0** (2014-07-27)

 - pass in api.coffee arguments as the first variable instead of as 'this'

**v1.4.1** (2014-07-23)

 - add option to lint specific files

**v1.4.0** (2014-07-18)

 - fix partial reload media query issues for stylus

**v1.3.2** (2014-07-07)

 - bump mongofb to 0.9.x to fix non-unique insert ids

**v1.3.1** (2014-06-13)

 - allow dev cache to use 1 (next) or 3 params (req, res, next)

**v1.3.0** (2014-05-31)

 - add lint to usage
 - exit cli after sett.ing up a new site
 - add dobi clone

**v1.2.0** (2014-05-25)

 - add dobi lint
 - rename dobi.coffee to cli.coffee

**v1.1.1** (2014-05-24)

 - coffee-script/register needed in 1.7.x

**v1.1.0** (2014-05-24)

 - update mongofb to 0.8.x
 - rename install to setup
 - update coffee-script to 1.7.x
 - update cson: updates dependencies (including CS)
 - update async: various updates
 - update findit: adds optional custom fs
 - update jwt-simple: adds new algorithm

**v1.0.3** (2014-05-23)

 - store files in base64 on deploy

**v1.0.2** (2014-05-23)

 - update bin in package.json

**v1.0.1** (2014-05-23)

 - remove crypto from package.json

**v1.0.0** (2014-05-22)

 - change name from lessthan3 to dobi
 - refactor lt3/lpm tools into new dobi binary

**v0.8.3** (2014-05-12)

 - typo in new cache code

**v0.8.2** (2014-05-12)

 - clean up clone code

**v0.8.1** (2014-05-11)

 - cache most requests for a full day

**v0.8.0** (2014-05-11)

 - allow for custom cache function

**v0.7.0** (2014-05-11)

 - update asset-wrap to 0.8.0 which updates uglifyjs

**v0.6.9** (2014-04-30)

 - update setup to use uid instead of _id

**v0.6.8** (2014-04-25)

 - change listening port to 3002 (3000/3001 for production http/https)

**v0.6.7** (2014-04-23)

 - add jwt-simple dependency

**v0.6.6** (2014-04-23)

 - add authentication to package api calls

**v0.6.5** (2014-03-21)

 - replace all substitutions, not just the first

**v0.6.4** (2014-03-21)

 - force utf8 for reading CSON files to fix arrays going into firebase

**v0.6.3** (2014-03-20)

 - change .page to .object to reinforce pages are just special objects

**v0.6.2** (2014-03-18)

 - make v2 sites the default commands and move v1 to v1:
 - use node instead of coffee for binaries to remove global coffee dependency

**v0.6.1** (2014-03-17)

 - fix site create when product has no collections
 - use config.core instead of config.type for compiling rules

**v0.6.0** (2014-03-16)

 - change domains.domain to domain.url
 - take advantage of new pre-processing with asset-wrap
 - better .exports shortcutting for new 2.0 site layouts
 - use pre-processing to add in extends for new coffee files
 - move old coffee-script replacements to new post-processing function
 - only init header js to {} if not explicitly settings data (config/schema)
 - imports.styl must be first as @import need to start the css file
 - concat variables.styl to the beginning of all other styl files
 - remove header initialization for libraries
 - add v2:add:page and v2:add:object for new sites
 - single file reload for more efficient reloading during development

**v0.5.17** (2014-03-10)

 - add v2:create for new site creation
 - modify getPackageConfig to look up any package config

**v0.5.16** (2014-03-10)

 - add code substitutions for Collection and Object

**v0.5.15** (2014-03-06)

 - use chokidar 0.7.1 due to windows bug in 0.8.0

**v0.5.14** (2014-03-06)

 - adding some debug info to fix a windows problem

**v0.5.13** (2014-03-06)

 - log error differently for local file watching

**v0.5.12** (2014-03-01)

 - better error message when unavailable to parse CSON

**v0.5.11** (2014-03-01)

 - only read cson files for schema - watch out for swap files

**v0.5.10** (2014-03-01)

 - bug in last deploy

**v0.5.9** (2014-03-01)

 - always set latest schema when loading main.js

**v0.5.8** (2014-02-24)

 - supply more information about the modified file for hot code pushes

**v0.5.7** (2014-02-24)

 - simpler css asset sorting

**v0.5.6** (2014-02-24)

 - import entire style directory for style.css
 - fix .css package dependencies

**v0.5.5** (2014-02-23)

 - separate config and schema for packages

**v0.5.4** (2014-02-23)

 - change load order for main.js compilation

**v0.5.3** (2014-02-23)

 - change View to Presenter

**v0.5.2** (2014-02-23)

 - ignore api.coffee for main.js compilation

**v0.5.1** (2014-02-23)

 - adding some backwards compatibility

**v0.5.0-beta** (2014-02-12)

 - read in individual schema files
 - make all fs calls async for better performance and error handling

**v0.4.2** (2014-02-07)

 - replace express bodyParser per expressjs 3.x request

**v0.4.1** (2014-02-04)

 - css or javascript compile errors are now 400 instead of 500 errors

**v0.4.0** (2014-02-03)

 - update dependencies

**v0.3.5** (2014-02-02)

 - bump asset-wrap version to 0.5.x

**v0.3.4** (2014-02-01)

 - do not cache api.coffee files on dev servers

**v0.3.3** (2014-01-20)

 - add initial lpm commands

**v0.3.2** (2014-01-12)

 - add --dev option to open to force local dev load

**v0.3.1** (2014-01-10)

 - fix error in usage dialog
 - disallow creating workspaces within other workspaces

**v0.3.0** (2014-01-08)

 - add admin to site
 - add app to site
 - add page to site app
 - create a new site
 - initialize a new workspace
 - new login workflow
 - daemonize dev server

**v0.2.10** (2013-12-17)

 - add maxAge header for /public files

**v0.2.9** (2013-12-02)

 - fix path.join error for node 0.10.x
 - lowercase import for cson
 - exit process after lt3 init
 - add basic create:entity support

**v0.2.8** (2013-11-04)

 - typo in last update

**v0.2.7** (2013-11-04)

 - add req.body shortcut

**v0.2.6** (2013-11-01)

 - watch out for custom main.js in config

**v0.2.5** (2013-11-01)

 - dont add connect path on prod
 - add version command to binaries
 - make paths Windows safe
 - remove package.cson and package.coffee support

**v0.2.4** (2013-10-13)

 - report error information in the console
 - fix non-package files in pkg (ex: .DS_STORE)

**v0.2.3** (2013-10-07)

 - add starting dev server to CLI

**v0.2.2** (2013-10-07)

 - fix path to binary in package.json

**v0.2.1** (2013-10-07)

 - begin work on CLI

**v0.2.0** (2013-10-04)

 - bump asset-wrap to 0.4.x

**v0.1.16** (2013-10-04)

 - use $ for prefix on stylus variables

**v0.1.15** (2013-10-01)

 - bump firebase version to 0.6.x

**v0.1.14** (2013-08-26)

 - fix api method routing

**v0.1.13** (2013-08-26)

 - allow string parameter to cache (assumes string is age)

**v0.1.12** (2013-08-24)

 - bug fixes

**v0.1.11** (2013-08-24)

 - allow package api calls to be GET or POST

**v0.1.10** (2013-08-06)

 - update asset-wrap

**v0.1.9** (2013-08-03)

  - return available local packages when connecting

**v0.1.8** (2013-08-03)

 - watch out for errors in bad packages
 - change /local-dev/setToken to /connect

**v0.1.7** (2013-07-30)

 - rename package to config. leaving package for backwards compatibility

**v0.1.6** (2013-07-30)

 - move read_package higher up to fix watcher

**v0.1.5** (2013-07-29)

 - prefer config.cson to package.cson
 - add some example packages

**v0.1.4** (2013-07-29)

 - add @query to context of api calls

**v0.1.3** (2013-07-29)

 - do not crash if a package can not be found
 - lowercase on comments

**v0.1.2**

 - Start CHANGELOG.md
