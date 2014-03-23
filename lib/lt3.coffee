###
# Project Management for LessThan3 platform development
#   - authenticate
#   - create new websites/apps/pages
#   - run a development server
###

# dependencies
{
  command, args, opts, config, exit,
  getDB, getFB, getPackageConfig, getCustomSetupConfig, getPackageJSON,
  initWorkspace, isLoggedIn,
  log, pkg_config, open, rl, runServer, saveConfig
} = require '../lib/bin_utils'

async = require 'async'

## additional requirements
if typeof window != 'undefined'
  extend = (target, object) ->
    $.extend true, target, object
else
  extend =  require 'node.extend'


# usage
USAGE = """
Usage: lt3 <command> [command-specific-options]

where <command> [command-specific-options] is one of:
  add:object <type> <site> <slug>         add an object to a v2 site
  add:page <type> <site> <slug>           add a page to a v2 site
  create <site> [<product>]               create a v2 site
  docs                                    open docs page
  help                                    show usage
  init                                    initialize a new lessthan3 workspace
  login                                   authenticate your user
  open [<site>] [<page>]                  open a site
  run                                     run a development server
  start                                   daemonize a development server
  stop                                    stop a daemonized devevelopment server
  version                                 check your lt3 version
  whoami                                  check your local user
  v1:add:admin <site> <facebook_id>       add a new admin to a site
  v1:add:app <site> <app> <id>@<version>  add an app package to a site
  v1:add:page <site> <app> <page> <type>  add a new page to a site's app
  v1:create <site>                        create your own website
  whoami                                  check your local user
"""


# execute selected command
switch command


  # add an admin to a site
  when 'v1:add:admin'

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
  when 'v1:add:app'

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
              exit "to view: lt3 open #{site_slug} #{app_slug} --dev"



  # add a page to a site
  when 'v1:add:page'

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
              exit "to view: lt3 open #{site_slug} #{app_slug} #{page_slug} --dev"
      
  # create a new site
  when 'v1:create'

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
        

  when 'docs'
    open 'http://www.lessthan3.com/developers'
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
    url = "#{url}?dev=1" if opts.dev
    open url
    exit "opening url: #{url}"

  
  # run a development server
  when 'dev'
    log "dev is deprecated. please use 'lt3 run'"
  when 'run'
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
      log JSON.stringify config.user, null, 2
      exit ''

  # create a new site
  when 'create'

    # parse arguments
    site_slug = args[0]
    pkg = args[1]
    exit("must specify site slug") unless site_slug
    if pkg
      [pkg_id, pkg_version] = pkg.split '@'
    else if pkg_config
      pkg_id = pkg_config.id
      pkg_version = pkg_config.version
    else
      exit 'must specify package id@version or run from inside a package'

    pkg_config = getPackageConfig pkg_id, pkg_version
    exit("could not find package #{pkg_id}@#{pkg_version}") unless pkg_config

    getDB (db) ->

      # make sure site location isn't taken
      db.get('sites').findOne {slug: site_slug}, (err, site) ->
        
        throw err if err
        exit('slug is already taken. please choose another') if site

       
        data = {
          created: Date.now()
          data:
            collections: {}
            header: {}
            footer: {}
            style: {}
          name: site_slug
          package:
            id: pkg_id
            version: pkg_version
          regions: {}
          settings:
            code_injection:
              header: ''
              footer: ''
            domain:
              url: "www.lessthan3.com/#{site_slug}"
            localization: ['en']
            security:
              password: ''
            seo:
              title: ''
              description: ''
              keywords: ''
              image: ''
              hide_from_search_engines: ''
              icons:
                favicon: ''
                apple:
                  '57x57': ''
                  '72x72': ''
                  '114x114': ''
                  '144x144': ''
            services:
              facebook_app_id: ''
              disqus_shortname: ''
              google_analytics_id: ''
            transitions:
              mobile: 'slide'
              web: 'fade'
          slug: site_slug
          style: {}
          users: {}
        }

        # Inject collections
        if pkg_config.collections
          collectionsInjected={}
          for key, value of pkg_config.collections
            collectionsInjected[key]={"slug":value}

          data.data.collections=collectionsInjected

        setup_config = getCustomSetupConfig pkg_id, pkg_version
        # add self as admin
        data.users[config.user._id] = 'admin'

        # handle null case
        if setup_config
          setup_config_site = setup_config.site
          # combines data set
          new_data =  extend true, setup_config_site, data
        else
          new_data = data


        # insert into database must happen first to get site _id        
        db.get('sites').insert data, (err, site) ->
          throw err if err
          log site

          # no need to load objects/pages if there is no setup_config
          exit() unless setup_config
          
          # async objects function called later below
          asyncObjects = (nextFunc) => 
            async.forEach setup_config.objects , (object, next) =>
              object.seo={
                title: ''
                description: ''
                keywords: ''
                image: ''
              }
              object.created = Date.now()
              object.site_id = site.get('_id').val()
              db.get('objects').insert object , (err, site) ->
                throw err if err
                throw "error missing collection! aborted" unless object.collection
                throw "error missing type! aborted" unless object.type
                next()
            , 
            (err) =>
              log "objects loaded"
              nextFunc(err,"page")

          # parallel sync of functions
          async.parallel [
            asyncObjects
          ], (err, results) ->
            exit err, err if err
            exit()
        

  when 'add:page'
    # parse arguments
    page_type = args[0]
    site_slug = args[1]
    page_slug = args[2]
    exit("must specify page type") unless page_type
    exit("must specify site slug") unless site_slug
    exit("must specify page slug") unless page_slug
    page_slug = page_slug.replace /^\/(.*)/, '$1'

    getDB (db) ->
      
      # make sure site exists
      db.get('sites').findOne {
        slug: site_slug
      }, (err, site) ->
        throw err if err
        exit('site does not exist') unless site

        # make sure page location isn't taken
        db.get('objects').findOne {
          'site_id': site.get('_id').val()
          slug: page_slug
        }, (err, object) ->
          throw err if err
          exit('page already exists at this location') if object

          # insert new page
          db.get('objects').insert {
            data: {}
            page_type: page_type
            password: ''
            seo:
              title: ''
              description: ''
              keywords: ''
              image: ''
            site_id: site.get('_id').val()
            slug: page_slug
            tags: [page_slug, page_type]
            type: 'page'
          }, (err, object) ->
            throw err if err
            log "page added to #{site_slug}"
            exit()

  when 'add:object'

    # parse arguments
    object_type = args[0]
    site_slug = args[1]
    object_slug = args[2]
    exit("must specify object type") unless object_type
    exit("must specify site slug") unless site_slug
    exit("must specify object slug") unless object_slug
    object_slug = object_slug.replace /^\/(.*)/, '$1'

    getDB (db) ->
      
      # make sure site exists
      db.get('sites').findOne {
        slug: site_slug
      }, (err, site) ->
        throw err if err
        exit('site does not exist') unless site

        # make sure page location isn't taken
        db.get('objects').findOne {
          'site_id': site.get('_id').val()
          slug: object_slug
        }, (err, object) ->
          throw err if err
          exit('object already exists at this location') if object

          # insert new page
          db.get('objects').insert {
            data: {}
            password: ''
            seo:
              title: ''
              description: ''
              keywords: ''
              image: ''
            site_id: site.get('_id').val()
            slug: object_slug
            tags: [object_type, object_slug]
            type: object_type
          }, (err, object) ->
            throw err if err
            log "object added to #{site_slug}"
            exit()



  # invalid command
  else
    exit USAGE
    
