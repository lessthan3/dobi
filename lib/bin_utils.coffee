# dependencies
fs = require 'fs'
mongofb = require 'mongofb'
open = require 'open'
optimist = require 'optimist'
path = require 'path'
readline = require 'readline'
CSON = require 'cson'
Firebase = require 'firebase'


# open a page in a browser
exports.open = (url) ->
  open url

# save user's global configuration file
exports.saveConfig = ->
  fs.writeFileSync exports.GLOBAL_CONFIG_PATH, JSON.stringify exports.config

# read a user's global configuration file
exports.readConfig = ->
  if not fs.existsSync exports.GLOBAL_CONFIG_PATH
    exports.saveConfig {}
  JSON.parse fs.readFileSync exports.GLOBAL_CONFIG_PATH

# get mongofb connection
exports.getDB = (next) =>
  exports.isLoggedIn ->
    exports.log 'connecting to database'
    db = new mongofb.client.Database {
      server: 'http://www.lessthan3.com/db/1.0'
      firebase: 'https://lessthan3.firebaseio.com'
    }
    db.cache = false
    db.auth exports.config.token, ->
      next db

# get firebase connection
exports.getFB = ->
  new Firebase exports.FIREBASE_URL

# get the Firebase server time
exports.getFirebaseTime = (next) ->
  fb = exports.getFB()
  ref = fb.child '.info/serverTimeOffset'
  ref.once 'value', (snapshot) ->
    offset = snapshot.val()
    next Date.now() + offset

# read lessthan3 package.json
exports.getPackageJSON = ->
  require path.join '..', 'package'

# get the current package configuration
exports.getPackageConfig = ->
  if exports.PACKAGE_PATH
    CSON.parseFileSync "#{exports.PACKAGE_PATH}/config.cson"

# get the current package path
exports.getPackagePath = ->
  current = exports.CWD
  while true
    if fs.existsSync path.join current, 'config.cson'
      return current
    else
      parent = path.join current, '..'
      return null if current == parent
      current = parent

exports.getWorkspacePath = ->
  current = exports.CWD
  while true
    if fs.existsSync path.join current, 'workspace.json'
      return current
    else
      parent = path.join current, '..'
      return null if current == parent
      current = parent

exports.initWorkspace = ->
  fs.mkdir path.join(exports.CWD, 'pkg'), (err) ->
    fs.writeFileSync path.join(exports.CWD, 'workspace.json'), JSON.stringify {}
    exports.exit()

exports.isLoggedIn = (next) ->
  exports.log 'authenticating'
  if not exports.config.user
    throw "You must login. lt3 login"
  exports.getFirebaseTime (server_time) ->
    if server_time > exports.config.token_expires
      exports.exit "Token has expired. please re-authenticate. lt3 login"
    next()

exports.confirm = (msg, next) ->
  exports.rl.question "#{msg}? [y/n] ", (answer) ->
    if answer.match(/^y(es)?$/i) then next() else exports.exit()

exports.log = (msg) ->
  console.log msg

exports.exit = (msg='bye') ->
  exports.log msg if msg
  process.exit()

exports.runServer = ->
  if not exports.WORKSPACE_PATH
    exports.exit 'must be in a workspace to run a development server'

  # dependencies
  express = require 'express'
  lessthan3 = require './server'
  pkg = require path.join '..', 'package'

  # configuration
  app = express()
  app.use express.logger()
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use express.cookieParser()
  app.use lessthan3 {
    pkg_dir: path.join exports.WORKSPACE_PATH, 'pkg'
  }
  app.use app.router
  app.use express.errorHandler {dumpExceptions: true, showStack: true}

  # listen
  app.listen pkg.config.port
  exports.log "listening: #{pkg.config.port}"
  return app

# parse arguments
exports.parseArgs = ->
  argv = optimist.argv._
  command = argv[0]
  args = argv[1...argv.length]
  [command, args]

#setup a readline interface
exports.rl = readline.createInterface {
  input: process.stdin
  output: process.stdout
}


# constants
exports.CWD = process.cwd()
exports.FIREBASE_URL = 'https://lessthan3.firebaseio.com'
exports.USER_HOME = process.env.HOME or process.env.HOMEPATH or process.env.USERPROFILE
exports.GLOBAL_CONFIG_PATH = "#{exports.USER_HOME}/.lt3_config"
exports.WORKSPACE_PATH = exports.getWorkspacePath()
exports.PACKAGE_PATH = exports.getPackagePath()
exports.pkg_config = exports.getPackageConfig()
exports.config = exports.readConfig()
[exports.command, exports.args] = exports.parseArgs()

