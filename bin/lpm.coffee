#!/usr/bin/env coffee

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
  initWorkspace, isLoggedIn,
  log, pkg_config, open, rl, runServer, saveConfig
} = require '../lib/bin_utils'


# usage
USAGE = """
Usage: lpm <command> [command-specific-options]

where <command> [command-specific-options] is one of:
  deploy                                deploy a package to production
  get <id>[@<version>]                  download a package
  help                                  show usage
  info <id>[@<version>]                 get info about a package
  init <id> <version>                   create a new package
  login                                 authenticate your user
  stage                                 deploy a package to staging
  version                               check your lpm version
  whoami                                check your local user
"""


# execute selected command
main = ->

  switch command
    when 'deploy'
      console.log 'not yet available'
    when 'get'
      console.log 'not yet available'
    when 'info'
      console.log 'not yet available'
    when 'init'
      console.log 'not yet available'
    when 'install'
      console.log 'not yet available'
    when 'login'
      console.log 'not yet available'
    when 'stage'
      console.log 'not yet available'
    when 'publish'
      console.log 'not yet available'
    when 'version'
      console.log 'not yet available'
    when 'whoami'
      console.log 'not yet available'
    else
      exit()
    exit()
      

# start script
config = readConfig()
main()

