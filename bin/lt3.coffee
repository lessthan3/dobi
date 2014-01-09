#!/usr/bin/env coffee

###
# Project Management for LessThan3 platform development
#   - authenticate
#   - create new websites/apps/pages
#   - run a development server
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
Usage: lt3 <command> [command-specific-options]

where <command> [command-specific-options] is one of:
  add:admin <site> <facebook_id>          add a new admin to a site
  add:app <site> <app> <id>@<version>     add an app package to a site
  add:page <site> <app> <page> <type>     add a new page to a site's app
  create <site>                           create your own website
  deploy                                  deploy a package to production
  help                                    show usage
  init                                    initialize a new lessthan3 workspace
  login                                   authenticate your user
  open [<site>] [<app>] [<page>]          open a site
  run                                     run a development server
  start                                   daemonize a development server
  stop                                    stop a daemonized devevelopment server
  version                                 check your lt3 version
  whoami                                  check your local user
"""


# execute selected command
switch command


  # add an admin to a site
  when 'add:admin'

    # parse arguments
    site_slug = args[0]
    fb_id = args[1]
    exit("must specify site slug") unless site_slug
    exit("must specify admin facebook id") unless fb_id

    getDB (db) ->

      # make sure site exists
      db.get('entities').findOne {slug: site_slug}, (err, site) ->
        throw err if err
        exit('site does not exist') unless site

        # add admin to site
        site.get("users.#{fb_id}").set 'admin', (err) ->
          throw err if err
          exit "#{fb_id} is now an admin of #{site_slug}"


  # add an app to a site
  when 'add:app'

    # parse arguments
    site_slug = args[0]
    app_slug = args[1]
    pkg = args[2]
    exit("must specify site slug") unless site_slug
    exit("must specify app slug") unless app_slug
    if pkg
      [pkg_id, pkg_version] = pkg.split '@'
    else if pkg_config
      pkg_id = pkg_config.id
      pkg_version = pkg_config.version
    else
      exit 'must specify package id@version or run from inside a package'

    getDB (db) ->

      # make sure site exists
      db.get('entities').findOne {slug: site_slug}, (err, site) ->
        throw err if err
        exit('site does not exist') unless site

        # make sure app location isn't taken  
        db.get('apps').findOne {
          'entity._id': site.get('_id').val()
          slug: app_slug
        }, (err, app) ->
          throw err if err
          exit('app already exists at this location') if app

          # insert app
          db.get('apps').insert {
            active: true
            entity:
              _id: site.get('_id').val()
              _ref: 'entities'
            name: app_slug
            package:
              id: pkg_id
              version: pkg_version
            slug: app_slug
          }, (err, app) ->
            throw err if err
            log "#{app_slug} is now an app of #{site_slug}"

            # add index page
            db.get('pages').insert {
              active: true
              app:
                _id: app.get('_id').val()
                _ref: 'apps'
              data: {}
              entity:
                _id: site.get('_id').val()
                _ref: 'entities'
              meta:
                description: ''
                keywords: ''
                name: app_slug
                image: ''
              slug: ''
              type: 'index'
            }, (err, doc) ->
              throw err if err
              log "index page added to #{site_slug}"
              exit "to view: lt3 open #{site_slug} #{app_slug}"



  # add a page to a site
  when 'add:page'

    # parse arguments
    site_slug = args[0]
    app_slug = args[1]
    page_slug = args[2]
    page_type = args[3]
    exit("must specify site slug") unless site_slug
    exit("must specify app slug") unless app_slug
    exit("must specify page slug") unless page_slug
    exit("must specify page type") unless page_type
    page_slug = page_slug.replace /^\/(.*)/, '$1'

    getDB (db) ->
      
      # make sure site exists
      db.get('entities').findOne {
        slug: site_slug
      }, (err, site) ->
        throw err if err
        exit('site does not exist') unless site

        # make sure app exists
        db.get('apps').findOne {
          'entity._id': site.get('_id').val()
          slug: app_slug
        }, (err, app) ->
          throw err if err
          exit('app does not exist') unless app

          # make sure page location isn't taken
          db.get('pages').findOne {
            'entity._id': site.get('_id').val()
            'app._id': app.get('_id').val()
            slug: app_slug
          }, (err, page) ->
            throw err if err
            exit('page already exists at this location') if page

            # insert new page
            db.get('pages').insert {
              active: true
              app:
                _id: app.get('_id').val()
                _ref: 'apps'
              data: {}
              entity:
                _id: site.get('_id').val()
                _ref: 'entities'
              meta:
                description: ''
                keywords: ''
                name: page_slug
                image: ''
              slug: page_slug
              type: page_type
            }, (err, page) ->
              throw err if err
              log "page added to #{site_slug}"
              exit "to view: lt3 open #{site_slug} #{app_slug} #{page_slug}"


  # create a new site
  when 'create'

    # parse arguments
    site_slug = args[0]
    exit("must specify site slug") unless site_slug

    getDB (db) ->

      # make sure site location isn't taken
      db.get('entities').findOne {slug: site_slug}, (err, site) ->
        throw err if err
        exit('slug is already taken. please choose another') if site
        data = {
          account:
            home_page: ''
            hosting:
              web: "www.lessthan3.com/#{site_slug}"
            meta:
              name: site_slug
            private: true
          slug: site_slug
          theme:
            package:
              id: 'ahq-theme'
              version: '1.0.0'
          created: Date.now()
          users: {}
        }

        # add self as admin
        data.users[config.user.id] = 'admin'

        # insert into database
        db.get('entities').insert data, (err, entity) ->
          throw err if err
          log entity.val()
          exit()


  # create lessthan3 workspace
  when 'init'
    log 'initializing workspace'
    initWorkspace()
  
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


  # open a page in the browser
  when 'open'
    url = "http://www.lessthan3.com"
    for n in [0..2]
      url += "/#{args[n]}" if args[n]
    open url
    exit "opening url: #{url}"

  
  # run a development server
  when 'run', 'dev'
    runServer()


  # daemonize a development server
  when 'start'
    if config.pid
      try process.kill config.pid, 'SIGHUP'
      config.pid = null
      saveConfig()
    cp = require('child_process')
    child = cp.spawn 'coffee', ["#{__dirname}/lt3.coffee", 'run'], {
      detached: true
      stdio: [ 'ignore', 'ignore', 'ignore']
    }
    child.unref()
    config.pid = child.pid
    saveConfig()
    exit ''

  # stop a daemonized development server
  when 'stop'
    if config.pid
      process.kill config.pid
      config.pid = null
      saveConfig()
    exit()


  # check the current version of lt3
  when 'v', 'version'
    pkg = getPackageJSON()
    log pkg.version
    exit ''

  
  # check your login status
  when 'whoami'
    isLoggedIn ->
      log config.user
      exit()


  # invalid command
  else
    exit USAGE
    
