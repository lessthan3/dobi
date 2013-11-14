#!/usr/bin/env coffee

###
# Package Management for LessThan3 platform development
#   - install existing packages
#   - create new packages
#   - deploy packages
###


# dependencies
optimist = require 'optimist'
CSON = require 'cson'
Firebase = require 'firebase'
fs = require 'fs'
readline = require 'readline'


# constants
CWD = process.cwd()
FIREBASE_URL = 'https://lessthan3.firebaseio.com'
USER_HOME = process.env.HOME or process.env.HOMEPATH or process.env.USERPROFILE
CONFIG_PATH = "#{USER_HOME}/.lt3_config"
USAGE = """
Usage: lt3 <command> [command-specific-options]

where <command> [command-specific-options] is one of:
  info id
  install id[@version]
  publish id[@version]
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
  if not config.user
    throw "You must login. lt3 auth:login"
  getFirebaseTime (server_time) ->
    if server_time < config.user.expires
      throw "Token has expired. please login. lt3 auth:login"
    next()

confirm = (msg, next) ->
  rl.question "#{msg}? [y/n] ", (answer) ->
    if answer.match(/^y(es)?$/i) then next() else exit()

exit = (bye=true)->
  #console.log 'so long, and thanks for all the fish'
  #console.log 'slatfatf'
  console.log('bye') if bye
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
    optimist.showHelp()
    exit false

  switch command
    when 'info'
      package_id = argv._[1]
      if not package_id
        throw 'Must specify a package'
    when 'install'
      console.log 'not yet available: install'
    when 'publish'
      console.log 'not yet available: publish'
    when 'version'
      pkg = require path.join '..', 'package'
      console.log pkg.version
      exit ''
    else
      exit()
      

# start script
config = readConfig()
main()

