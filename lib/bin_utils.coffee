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

# get the specified or current package configuration
exports.getPackageConfig = (id, version)->
  if id and version
    CSON.parseFileSync "#{exports.WORKSPACE_PATH}/pkg/#{id}/#{version}/config.cson"
  else
    if exports.PACKAGE_PATH
      CSON.parseFileSync "#{exports.PACKAGE_PATH}/config.cson"

# get the specified custom setup configuration configuration
exports.getCustomSetupConfig = (id, version)->
  if id and version
    return unless fs.existsSync("#{exports.WORKSPACE_PATH}/pkg/#{id}/#{version}/setup.cson")
    CSON.parseFileSync "#{exports.WORKSPACE_PATH}/pkg/#{id}/#{version}/setup.cson"
  else
    if exports.PACKAGE_PATH
      return unless fs.existsSync("#{exports.PACKAGE_PATH}/setup.cson")
      CSON.parseFileSync "#{exports.PACKAGE_PATH}/setup.cson"

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

# initialize an empty package directory
exports.initPackageDir = (id, version, next) ->

  # make sure the user is in a workspace
  if not exports.WORKSPACE_PATH
    exports.exit 'must be in a workspace to initialize a package'

  # make sure the user is logged in
  exports.isLoggedIn ->

    # create directories
    pkg_path = path.join exports.WORKSPACE_PATH, 'pkg', id
    fs.mkdir pkg_path, (err) ->
      pkg_path = path.join pkg_path, version
      fs.mkdir pkg_path, (err) ->
        fs.mkdir path.join(pkg_path, 'pages'), (err) ->
          next pkg_path

# initialize an empty new package
exports.initPackage = (id, version) ->

  exports.log 'initializing package'

  exports.initPackageDir id, version, (pkg_path) ->

    # config
    config = {
      author: "#{exports.config.user.name} <#{exports.config.user.email}>"
      category: 'default'
      changelog: {}
      contact: exports.config.user.email
      description: "#{id}@#{version}"
      developers: {}
      id: id
      name: "#{id}@#{version}"
      pages:
        index:
          title: 'string'
      private: false
      type: 'app'
      version: version
    }
    config.changelog[version] = 'initialize package'
    config.developers[exports.config.user.username] = 'admin'
    config = CSON.stringifySync(config).replace /\n\n/g, '\n'
    fs.writeFileSync path.join(pkg_path, 'config.cson'), config

    # app.coffee
    fs.writeFileSync path.join(pkg_path, 'app.coffee'), """
      class exports.App extends lt3.App
    """

    # style.styl
    fs.writeFileSync path.join(pkg_path, 'style.styl'), """
      @import 'nib'

      .exports
        margin 0px
    """

    # pages/index.coffee
    fs.writeFileSync path.join(pkg_path, 'pages', 'index.coffee'), """
      class exports.Page extends lt3.Page
        events:
          'click .greeting': 'onClickGreeting'

        onClickGreeting: (e) ->
          $.alert 'Welcome to the World!'

        render: ->
          super()

        template: ->

          h2 class: 'greeting', ->
            "Dear World,"

          p class: 'body', ->
            "hello"

          p class: 'closing', ->
            "Yours Truly,"

          p class: 'signature', ->
            "#{exports.config.user.name}"
    """

    exports.exit "package successfully created: #{pkg_path}"



exports.initWorkspace = ->
  if exports.WORKSPACE_PATH
    exports.exit "you are already in a workspace: #{exports.WORKSPACE_PATH}"
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
    if answer.match /^y(es)?$/i
      next()
    else
      exports.exit()

exports.log = (msg) ->
  console.log msg

exports.exit = (msg='bye') ->
  exports.log msg if msg
  process.exit()

exports.runServer = ->
  if not exports.WORKSPACE_PATH
    exports.exit 'must be in a workspace to run a development server'

  # dependencies
  connect = require 'connect'
  express = require 'express'
  lessthan3 = require './server'
  pkg = require path.join '..', 'package'

  # configuration
  app = express()
  app.use express.logger '[:date] :status :method :url'
  app.use connect.urlencoded()
  app.use connect.json()
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
  opts = optimist.argv
  delete opts['$0']
  delete opts._
  [command, args, opts]

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
[exports.command, exports.args, exports.opts] = exports.parseArgs()

