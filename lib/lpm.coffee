
###
# Package Management for LessThan3 platform development
#   - install existing packages
#   - create new packages
#   - deploy packages
###

# dependencies
{
  command, args, config, exit,
  getDB, getFB, getPackageJSON,
  initPackage, initPackageDir, initWorkspace, isLoggedIn,
  log, pkg_config, open, rl, runServer, saveConfig,
  PACKAGE_PATH
} = require '../lib/bin_utils'
findit = require 'findit'
fs = require 'fs'
path = require 'path'


# usage
USAGE = """
Usage: lpm <command> [command-specific-options]

where <command> [command-specific-options] is one of:
  deploy                                deploy a package to production
  get <id>[@<version>]                  download a package
  help                                  show usage
  init <id>@<version>                   create a new package
  info <id>[@<version>]                 get info about a package
  login                                 authenticate your user
  stage                                 deploy a package to staging
  version                               check your lpm version
  whoami                                check your local user
"""


# execute selected command
switch command

  # deploy a package to production
  when 'deploy'

    # parse arguments
    if not pkg_config
      exit 'must run from inside a package'

    # config defaults
    pkg_config.private ?= false
    pkg_config.files = []
    pkg_config.changelog ?= []

    # required fields
    exit('id required') unless pkg_config.id
    exit('name required') unless pkg_config.name
    exit('type required') unless pkg_config.type
    exit('invalid type') unless pkg_config.type in ['app', 'library', 'theme']
    exit('version required') unless pkg_config.version

    # update changelog
    for k, v of pkg_config.changelog
      delete pkg_config.changelog[k]
      pkg_config.changelog[k.replace /\./g, '-'] = v

    # start deploy
    log "deploying #{pkg_config.id}@#{pkg_config.version}"

    # iterate over all file in the package
    finder = findit PACKAGE_PATH
    finder.on 'file', (file, stat) ->
      pkg_config.files.push {
        data: fs.readFileSync file, 'utf8'
        ext: path.extname(file).replace /^\./, ''
        name: path.basename file
        path: file.replace "#{PACKAGE_PATH}/", ''
        size: stat.size
      }
    finder.on 'end', (e) ->

      # check if package exists
      getDB (db) ->
        db.get('packages').findOne {
          id: pkg_config.id
          version: pkg_config.version
        }, (err, pkg) ->
          throw err if err
          if pkg
            msg = 'package already deployed. do you want to overwrite it? [y/n]'
            rl.question msg, (answer) ->
              if answer.match /^y(es)?$/i
                pkg.set pkg_config, (err) ->
                  throw err if err
                  exit 'package updated'
              else
                exit()
          else
            db.get('packages').insert pkg_config, (err, pkg) ->
              throw err if err
              exit 'package deployed'

  # download a package
  when 'get'
    pkg = args[0]
    [pkg_id, pkg_version] = pkg.split '@'
    if pkg_version
      params = {id: pkg_id, version: pkg_version}
    else
      params = {id: pkg_id, latest: true}

    getDB (db) ->
      db.get('packages').findOne params, (err, pkg) ->
        throw err if err

        # make sure package exists
        exit "Package does not exist" unless pkg
        data = pkg.val()

        # make sure user has access to read the source files
        dev = pkg.get('developers').val() or {}
        perms = ['read', 'write', 'admin']
        unless dev['*'] in perms or dev[config.user.username] in perms
          exit "You don't have read access to this package"

        # make sure files exist for this package
        files = pkg.get('files').val()
        exit "This package needs to be properly deployed" unless files

        initPackageDir data.id, data.version, (pkg_path) ->
          for file in files
            fs.writeFileSync "#{pkg_path}/#{file.path}", file.data
          exit "got package: #{pkg_path}"


  # get info about a package
  when 'info'
    pkg = args[0]
    [pkg_id, pkg_version] = pkg.split '@'
    if pkg_version
      params = {id: pkg_id, version: pkg_version}
    else
      params = {id: pkg_id, latest: true}

    getDB (db) ->
      fields = {files: 0}
      db.get('packages').findOne params, fields, (err, pkg) ->
        log JSON.stringify pkg.val(), null, 2
        exit()


  # initialize an empty package
  when 'init'
    pkg = args[0]
    if pkg
      [pkg_id, pkg_version] = pkg.split '@'
    else if pkg_config
      pkg_id = pkg_config.id
      pkg_version = pkg_config.version
    else
      exit 'must specify package id@version or run from inside a package'
    
    # default to 1.0.0 package if nothing specified
    pkg_version = "1.0.0" unless pkg_version
    exit("must specify package id") unless pkg_id
    initPackage pkg_id, pkg_version


  # authenticate the user
  when 'login'
    open 'http://dev.lessthan3.com/auth'
    rl.question "Enter Token: ", (token) ->
      fb = getFB()
      fb.auth token, (err, data) ->
        throw err if err
        config.user = data.auth
        config.token = token
        config.token_expires = data.expires
        saveConfig()
        exit()


  # deploy a package to staging
  when 'stage'
    console.log 'not yet available'


  # check the current version of lt3
  when 'v', 'version'
    pkg = getPackageJSON()
    log pkg.version
    exit ''


  # check your login status
  when 'whoami'
    isLoggedIn ->
      log JSON.stringify config.user, null, 2
      exit()


  # invalid command
  else
    exit USAGE

