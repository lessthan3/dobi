#!/usr/bin/env coffee

# dependencies
optimist = require 'optimist'
CSON = require 'CSON'
Firebase = require 'firebase'
fs = require 'fs'
readline = require 'readline'


# constants
FIREBASE_URL = 'https://lessthan3.firebaseio.com'
USER_HOME = process.env.HOME or process.env.HOMEPATH or process.env.USERPROFILE
CONFIG_PATH = "#{USER_HOME}/.lt3_config"
USAGE = """
Usage: lt3 COMMAND [command-specific-options]

lt3 init
lt3 auth:login
lt3 auth:setToken -t TOKEN
lt3 auth:whoami
lt3 pkg:create -i id -v version
lt3 pkg:download -i id -v version
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
  if not config.user
    throw "You must login. lt3 auth:login"
  getFirebaseTime (server_time) ->
    if server_time < config.user.expires
      throw "Token has expired. please login. lt3 auth:login"
    next()

confirm = (msg, next) ->
  rl.question "#{msg}? [y/n] ", (answer) ->
    if answer.match(/^y(es)?$/i) then next() else exit()

exit = ->
  #console.log 'so long, and thanks for all the fish'
  #console.log 'slatfatf'
  console.log 'bye'
  process.exit()


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
    return optimist.showHelp()

  switch command
    when 'auth:login'
      console.log """
        1. go to http://www.lessthan3.com
        2. open javascript console
        3. lt3.app.login(function(err, user){console.log(user.get('token').val());});
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
        process.exit()
    when 'auth:whoami'
      isLoggedIn ->
        console.log config.user
        process.exit()
    when 'pkg:download'
      console.log 'start'
    when 'init'
      console.log 'initializing project'
      msg = "Are you sure you want to create a project in #{process.cwd()}"
      confirm msg, ->
        console.log 'confirmed'
      

# start script
config = readConfig()
main()

