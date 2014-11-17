
# dependencies
CSON = require 'cson'
Firebase = require 'firebase'
async = require 'async'
coffeelint = require 'coffeelint'
colors = require 'colors'
columnify = require 'columnify'
clipboard = require('copy-paste').noConflict()
crypto = require 'crypto'
extend =  require 'node.extend'
findit = require 'findit'
fs = require 'fs'
htmlparser = require 'htmlparser2'
mkdirp = require 'mkdirp'
mongofb = require 'mongofb'
ncp = require('ncp').ncp
open = require 'open'
optimist = require 'optimist'
path = require 'path'
readline = require 'readline'
request = require 'request'
xml2js = require 'xml2js'

# helpers
rl = readline.createInterface {
  input: process.stdin
  output: process.stdout
}
XMLparser = new xml2js.Parser {explicitArray: false}

log = (msg) ->
  console.log "[dobi] #{msg}"


# constants
CWD = process.cwd()
DATABASE_URL = 'http://www.dobi.io/db/1.0'
FIREBASE_URL = 'https://lessthan3.firebaseio.com'
USER_HOME = process.env.HOME or process.env.HOMEPATH or process.env.USERPROFILE
USER_CONFIG_PATH = "#{USER_HOME}/.lt3_config"

module.exports =



  getWorkspacePath: (current, next) ->
    [current, next] = [CWD, current] if not next
    fs.exists path.join(current, 'dobi.json'), (exists) =>
      if exists
        next current
      else
        parent = path.join current, '..'
        return next null if parent is current
        @getWorkspacePath parent, next

  getWorkspacePathSync: (current=CWD) ->
    return current if fs.existsSync path.join(current, 'dobi.json')
    parent = path.join current, '..'
    return null if parent is current
    @getWorkspacePathSync parent

  login: (require_logged_in, next) ->
    [require_logged_in, next] = [false, require_logged_in] unless next
    log 'authenticating user'
    @readUserConfig (config) =>
      if config.user
        next config
      else if not require_logged_in
        next {user: null}
      else
        log 'not logged in: must authenticate'
        log 'opening login portal in just a few moments'
        setTimeout ( ->
          open 'http://www.dobi.io/auth'
          rl.question "Enter Token: ", (token) ->
            exit 'must specify token' unless token
            fb = new Firebase FIREBASE_URL
            fb.auth token, (err, data) ->
              exit 'invalid token' if err
              config.user = data.auth
              config.token = token
              config.token_expires = data.expires
              saveUserConfig config, ->
                next config
        ), 3000

  logout: (next) ->
    saveUserConfig {}, ->
      next()

  readUserConfig: (next) ->
    fs.exists USER_CONFIG_PATH, (exists) ->
      if exists
        fs.readFile USER_CONFIG_PATH, 'utf8', (err, data) ->
          exit 'unable to read user config' if err
          next JSON.parse data
      else
        @saveUserConfig {}, ->
          next {}

  saveUserConfig: (data, next) ->
    config = JSON.stringify data
    fs.writeFile USER_CONFIG_PATH, config, 'utf8', (err) ->
      exit 'unable to write user config' if err
      next()

