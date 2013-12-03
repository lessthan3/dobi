#!/usr/bin/env coffee

###
# Project Management for LessThan3 platform development
#   - authenticate
#   - create new websites/apps/pages
#   - run a development server
###

# dependencies
optimist = require 'optimist'
CSON = require 'cson'
Firebase = require 'firebase'
fs = require 'fs'
mongofb = require 'mongofb'
path = require 'path'
readline = require 'readline'


# constants
CWD = process.cwd()
FIREBASE_URL = 'https://lessthan3.firebaseio.com'
USER_HOME = process.env.HOME or process.env.HOMEPATH or process.env.USERPROFILE
CONFIG_PATH = "#{USER_HOME}/.lt3_config"
USAGE = """
Usage: lt3 <command> [command-specific-options]

where <command> [command-specific-options] is one of:
  auth:login
  auth:setToken -t TOKEN
  auth:whoami
  create:entity
  dev
  init
  version
"""

rl = readline.createInterface {
  input: process.stdin
  output: process.stdout
}


# helpers
writeConfig = (config) ->
  fs.writeFileSync CONFIG_PATH, JSON.stringify config

readConfig = ->
  if not fs.existsSync CONFIG_PATH
    writeConfig {}
  JSON.parse fs.readFileSync CONFIG_PATH

getFirebaseTime = (next) ->
  fb = new Firebase FIREBASE_URL
  ref = fb.child '.info/serverTimeOffset'
  ref.once 'value', (snapshot) ->
    offset = snapshot.val()
    next Date.now() + offset

isLoggedIn = (next) ->
  console.log 'authenticating'
  if not config.user
    throw "You must login. lt3 auth:login"
  getFirebaseTime (server_time) ->
    if server_time < config.user.expires
      throw "Token has expired. please login. lt3 auth:login"
    next()

confirm = (msg, next) ->
  rl.question "#{msg}? [y/n] ", (answer) ->
    if answer.match(/^y(es)?$/i) then next() else exit()

exit = (msg='bye')->
  console.log(msg)
  process.exit()

getDB = (next) =>
  isLoggedIn ->
    console.log 'connecting to database'
    client = mongofb.client
    db = new mongofb.client.Database {
      server: 'http://www.lessthan3.com/db/1.0'
      firebase: 'https://lessthan3.firebaseio.com'
    }
    db.cache = false
    db.auth config.user.token, ->
      next db
  
runDevServer = ->
  # dependencies
  express = require 'express'
  lessthan3 = require path.join '..', 'lib', 'server'
  pkg = require path.join '..', 'package'

  # configuration
  app = express()
  app.use express.logger()
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use express.cookieParser()
  app.use express.static "#{CWD}/public", {maxAge: 604800000}
  app.use lessthan3 {
    pkg_dir: path.join CWD, 'pkg'
  }
  app.use app.router
  app.use express.errorHandler {dumpExceptions: true, showStack: true}

  # listen
  app.listen pkg.config.port
  console.log "listening: #{pkg.config.port}"


# command line arguments
optimist = optimist
  .alias('h', 'help')
  .alias('i', 'id')
  .alias('t', 'token')
  .alias('v', 'version')
  .usage(USAGE)
argv = optimist.argv


# execute selected command
main = ->
  command = argv._[0]
  if argv.help or not command
    optimist.showHelp()
    exit false

  switch command
    when 'auth:login'
      console.log """
        1. go to http://www.lessthan3.com
        2. open javascript console
        3. app.login(function(err, user){console.log(user.get('token').val());});
        4. copy token
        5. come back to terminal
        6. lt3 auth:setToken PASTE_TOKEN
      """
    when 'auth:setToken'
      fb = new Firebase FIREBASE_URL
      fb.auth argv.token, (err, user) ->
        throw err if err
        user.auth.token = argv.token
        user.auth.token_expires = user.expires
        config.user = user.auth
        writeConfig config
        exit()
    when 'auth:whoami'
      isLoggedIn ->
        console.log config.user
        exit()
    when 'create:entity'
      exit("must specify slug") if argv._.length < 2
      getDB (db) ->
        slug = argv._[1]
        db.get('entities').findOne {slug :slug}, (err, entity) ->
          throw err if err
          exit('slug is already taken. please choose another') if entity
          data = {
            account:
              home_page: ''
              hosting:
                web: "www.lessthan3.com/#{slug}"
              private: true
            slug: slug
            theme:
              package:
                id: 'ahq-theme'
                version: '1.0.0'
            created: Date.now()
            users: {}
          }
          data.users[config.user.id] = 'admin'
          console.log config.user
          db.get('entities').insert data, (err, entity) ->
            throw err if err
            console.log entity.val()
            exit()
    when 'init'
      console.log 'initializing project'
      msg = "Are you sure you want to create a project in #{CWD}"
      confirm msg, ->
        fs.mkdirSync path.join CWD, 'pkg'
        console.log 'confirmed'
        exit()
    when 'dev'
      runDevServer()
    when 'version'
      pkg = require path.join '..', 'package'
      console.log pkg.version
      exit ''
    else
      exit()
      

# start script
config = readConfig()
main()

