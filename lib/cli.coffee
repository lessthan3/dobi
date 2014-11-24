
# dependencies
CSON = require 'cson'
async = require 'async'
cluster = require 'cluster'
colors = require 'colors'
crypto = require 'crypto'
dobiLint = require './dobi-lint'
extend =  require 'node.extend'
findit = require 'findit'
fs = require 'fs'
mkdirp = require 'mkdirp'
ncp = require('ncp').ncp
open = require 'open'
optimist = require 'optimist'
os = require 'os'
path = require 'path'
readline = require 'readline'
request = require 'request'
utils = require './utils'

# usage
USAGE = """
Usage: dobi <command> [command-specific-options]

where <command> [command-specific-options] is one of:
  backup <site-slug>                backup a site
  cache:bust <site-slug>            clear the cache for a site
  cache:refresh <www.domain.com>    clear and warm cache for domain. takes 'debug'
  cache:warm <www.domain.com>       warm a cache for a domain. takes 'debug'
  clone <src-slug> <dst-slug>       clone a site
  create <my-package> <type=app>    create a new package
  deploy <my-app>                   deploy an app
  docs                              open the dobi docs
  help                              show usage
  init                              initialize a workspace
  lint                              lint your package
  login                             authenticate your user
  logout                            deauthenticate your user
  open <site-slug>                  open a site
  run                               run a development server
  setup <my-app> <site-slug>        setup a site using your app
  start                             daemonize a development server
  stop                              stop a daemonized development server
  usage                             show usage
  version                           check your dobi version
  whoami                            check your authentication status
"""

# constants
CWD = process.cwd()

# helpers
config = {}
if fs.existsSync '/u/config/dobi-server'
  config = require '/u/config/dobi-server'

exit = (msg) ->
  log msg if msg
  process.exit()

log = (msg) ->
  console.log "[dobi] #{msg}"

# get arguments and options
argv = optimist.argv._
command = argv[0]
args = argv[1...argv.length]
opts = optimist.argv

switch command

  # backup your site data
  when 'backup'
    slug = args[0]

    # check arguments
    exit "must specify site slug" unless slug

    # connect to database
    utils.connect (user, db) ->

      # get site
      log 'find the site'
      db.get('sites').findOne {
        slug: slug
      }, (err, site) ->
        exit err if err
        exit 'could not find site' unless site
        log "site found: #{site.get('_id').val()}"

        # get objects
        log 'find the objects'
        db.get('objects').find {
          site_id: site.get('_id').val()
        }, {
          limit: 100000
        }, (err, objects) ->
          exit err if err
          log "#{objects.length} objects found"

          # format data
          data = CSON.stringifySync({
            site: site.val()
            objects: (object.val() for object in objects)
          }).replace /\n\n/g, '\n'

          # write to file
          name = "backup-#{slug}-#{Date.now()}.cson"
          fs.writeFileSync path.join(CWD, name), data

          # done
          exit "backup complete: #{name}"

  # clear the cache for a site
  when 'cache:bust'
    slug = args[0]

    # check arguments
    exit "must specify site site_slug" unless slug

    # bust cache
    utils.cacheBust {slug}, exit

  # clear mongo, rebuild mongo, clear fastly, warm fastly
  when 'cache:refresh'
    DOMAIN = args[0]
    debug_mode = true if args[1] is 'debug'
    log 'DEBUG MODE' if debug_mode
    exit "must specify domain" unless DOMAIN

    utils.cacheBust {domain: DOMAIN}, ->
      utils.cacheWarm {DOMAIN, debug_mode}, (err, data) ->
        {metrics, times} = data
        border = '= = = = = = = = = = = = = = = = = = = = = = = ='
        return exit err if err
        output = ['CACHE:REFRESH COMPLETE'.green, border, '']
        for {title, table} in metrics
          output = output.concat([title, table, ''])
        output.push "SCRIPTS LOAD TIME: #{times.SCRIPT_LOAD_TIME} seconds"
        output.push "TOTAL RUN TIME: #{times.SECONDS_ELAPSED} seconds"
        exit output.join '\n'


  # clear the cache for a site
  when 'cache:warm'
    DOMAIN = args[0]
    debug_mode = true if args[1] is 'debug'
    log 'DEBUG MODE' if debug_mode
    exit "must specify domain" unless DOMAIN

    utils.cacheWarm {
      DOMAIN: args[0]
      debug_mode: debug_mode or false
    }, (err, data) ->
      return exit err if err
      {metrics, times} = data
      border = '= = = = = = = = = = = = = = = = = = = = = = = ='
      output = ['CACHE:WARM COMPLETE'.green, border, '']
      for {title, table} in metrics
        output = output.concat([title, table, ''])
      output.push "SCRIPTS LOAD TIME: #{times.SCRIPT_LOAD_TIME} seconds"
      output.push "TOTAL RUN TIME: #{times.SECONDS_ELAPSED} seconds"
      exit output.join '\n'

  # clone a site
  when 'clone'
    src_slug = args[0]
    dst_slug = args[1]

    # check arguments
    exit "must specify site src_slug" unless src_slug
    exit "must specify site dst_slug" unless dst_slug

    # connect to database
    utils.connect (user, db) ->

      # get site
      log 'find the site'
      db.get('sites').findOne {
        slug: src_slug
      }, (err, src_site) ->
        exit err if err
        exit 'could not find site' unless src_site
        log "site found: #{src_site.get('_id').val()}"

        # get objects
        log 'find the objects'
        db.get('objects').find {
          site_id: src_site.get('_id').val()
        }, {
          limit: 100000
        }, (err, objects) ->
          exit err if err
          log "#{objects.length} objects found"

          # make sure new site doesn't already exist
          db.get('sites').findOne {
            slug: dst_slug
          }, (err, dst_site) ->
            exit err if err
            exit 'dst_slug already taken' if dst_site

            # create new site
            site = src_site.val()
            site.slug = dst_slug
            site.name = dst_slug
            site.settings.domain.url = "www.lessthan3.com/#{dst_slug}"
            site.settings.security.password = ''
            for k, v of site.settings.services
              site.settings.services[k] = ''
            site.users[user.admin_uid] = 'admin'
            site.settings.seo = {}
            site.settings.icons = {}
            db.get('sites').insert site, (err, dst_site) ->
              exit err if err

              # insert pages
              async.forEach objects, ((object, next) ->
                data = object.val()
                delete data._id
                data.seo = {}
                data.site_id = dst_site.get('_id').val()
                db.get('objects').insert data, (err) ->
                  exit err if err
                  next()
              ), (err) ->
                exit err if err
                exit 'clone complete'

  # create a new package
  when 'create'
    [id, version] = args[0].split '@'
    type = args[1] or 'app'

    # check arguments
    exit "must specify package id" unless id
    exit "must specify package version" unless version
    exit "must specify package type" unless type
    exit "invalid type: #{type}" if type not in ['app', 'plugin', 'library']

    # require login
    utils.login ({user}) ->
      exit "please login first: 'dobi login'" unless user

      # bootstrap the package
      source = path.join __dirname, '..', 'bootstrap', type
      workspace = utils.getWorkspacePathSync()
      exit 'must be in a workspace to create a package' unless workspace
      dest = path.join workspace, 'pkg', id, version
      mkdirp dest, (err) ->
        exit "error creating package: #{err}" if err
        ncp source, dest, (err) ->
          exit "Error creating package: #{err}" if err

          # update config
          config_path = path.join dest, 'config.cson'
          user_config = CSON.parseFileSync config_path
          user_config.id = id
          user_config.version = version
          user_config.author = {name: user.name, email: user.email}
          user_config.developers = {}
          user_config.developers[user.admin_uid] = 'admin'
          user_config = CSON.stringifySync(config).replace /\n\n/g, '\n'
          fs.writeFileSync config_path, user_config

          # done
          exit 'package created successfully'

  # deploy an app
  when 'deploy'
    [id, version] = args[0].split '@'

    # check arguments
    exit "must specify package id" unless id
    exit "must specify package version" unless version

    workspace = utils.getWorkspacePathSync()
    exit 'must be in a workspace to deploy your package' unless workspace

    # read config.cson
    log "deploying #{id}@#{version}"
    package_path = path.join workspace, 'pkg', id, version
    config_path = path.join package_path, 'config.cson'
    exists = fs.existsSync config_path
    exit 'package config.cson does not exist' unless exists
    pkg_config = CSON.parseFileSync config_path if exists
    pkg_config.files = []
    pkg_config.private ?= false

    # legacy
    delete pkg_config.changelog

    # load files
    log "loading files"
    finder = findit package_path
    finder.on 'file', (file, stat) ->
      data = fs.readFileSync(file).toString 'base64'
      pkg_config.files.push {
        data: data
        ext: path.extname(file).replace /^\./, ''
        md5: crypto.createHash('md5').update(data).digest('hex')
        name: path.basename file
        path: file.replace "#{package_path}/", ''
        size: stat.size
      }
    finder.on 'end', ->

      # sort files so md5 is consistent
      pkg_config.files.sort (a, b) -> if a.path > b.path then 1 else -1

      # update md5
      data = JSON.stringify config
      pkg_config.md5 = crypto.createHash('md5').update(data).digest('hex')

      # connect to database
      utils.connect (user, db) ->

        # make sure user is an admin
        pkg_config.developers ?= {}
        pkg_config.developers[user.admin_uid] = 'admin'

        # update main config
        ((next) ->
          log 'loading package config'
          db.get('packages_config').findOne {
            id: id
          }, (err, doc) ->
            exit err if err

            # updating config
            if doc
              if not doc.get("developers.#{user.admin_uid}").val() == 'admin'
                exit "you don't have permission to deploy this package"
              pkg_config._id = doc.get('_id').val()
              log 'updating package config'
              doc.set config, (err) ->
                exit err if err
                next config

            # new package
            else
              log 'creating new package'
              db.get('packages_config').insert config, (err, doc) ->
                exit err if err
                log 'package created'
                next doc.val()
        )((config) ->

          # make sure this version hasn't been deployed yet
          log 'checking for previous conflicting versions'
          db.get('packages').findOne {
            id: id
            version: version
          }, (err, pkg) ->
            exit err if err

            # set config reference
            pkg_config.config_id = pkg_config._id
            delete pkg_config._id

            ###
            # temp hack: allow package overwrite
            ###
            if pkg
              log 'package exists. overwriting'
              pkg_config._id = pkg.get('_id').val()
              pkg.set config, (err) ->
                exit err if err
                exit "package #{id}@#{version} re-deployed"

            else
              db.get('packages').insert config, (err, pkg) ->
                exit err if err
                exit "package #{id}@#{version} deployed"

            ###
            # END HACK
            ###
            return
            exit "cannot modify pre-existing version: #{version}" if pkg

            # insert new package to db
            db.get('packages').insert config, (err, pkg) ->
              exit err if err
              exit "package #{id}@#{version} deployed"
        )

  # open the dobi docs
  when 'docs'
    open 'http://www.dobi.io'
    exit()

  # show usage
  when 'help'
    exit USAGE

  # initialize a workspace
  when 'init'
    workspace = utils.getWorkspacePathSync()
    exit "already in a workspace: #{workspace}" if workspace
    fs.writeFile path.join(CWD, 'dobi.json'), JSON.stringify({
      created: Date.now()
    }), (err) ->
      exit 'failed to create workspace config' if err
      fs.mkdir path.join(CWD, 'pkg'), (err) ->
        exit 'failed to create pkg directory' if err
        exit "workspace successfully created at: #{CWD}"

  # lint your package
  when 'lint'

    exit "must specify package id@version" unless args[0]

    [id, version] = args[0].split '@'
    target = args[1]

    exit "must specify package id" unless id
    exit "must specify package version" unless version

    # read lint config
    config = JSON.parse fs.readFileSync "#{__dirname}/lint.json"

    # lint each file in the package
    files = []
    workspace = utils.getWorkspacePathSync()
    exit 'must be in a workspace to lint your package' unless workspace
    package_path = path.join workspace, 'pkg', id, version
    finder = findit package_path
    finder.on 'file', (file, stat) -> files.push file

    finder.on 'end', ->
      success = true
      async.eachSeries files, ((file, next) ->
        dobiLint file, (exit_code) ->
          success = false if exit_code
          next()
      ), (err) ->
        if success
          log 'Success! This package is lint free.'.green
        else
          log ''
          log ' ---------------------------------------------- '
          log '|         * * * E P I C    F A I L * * *       |'
          log '|                                              |'
          log '| Some files failed dobi lint validation.      |'
          log '|                                              |'
          log ' ---------------------------------------------- '
          log ''
        exit()

  # authenticate your user
  when 'login'
    utils.logout ->
      utils.login true, ({user}) ->
        exit JSON.stringify user, null, 2 if user
        exit 'not logged in. try "dobi login"'

  # deauthenticate your user
  when 'logout'
    utils.logout ->
      exit 'you are now logged out'

  # open a site
  when 'open'
    url = 'http://www.lessthan3.com'
    url += "/#{arg}" for arg in args
    open url
    exit()

  # run a development server
  when 'run'
    workspace = utils.getWorkspacePathSync()
    exit 'must be in a workspace to run the server' unless workspace

    if cluster.isMaster
      console.log "master #{process.pid}: running"
      for cpu, index in os.cpus()
        cluster.fork {CLUSTER_INDEX: index}
      cluster.on 'exit', (worker, code, signal) ->
        console.log "worker #{worker.process.pid}: died. restart..."
        console.log code
        console.log signal
        cluster.fork()
    else
      console.log "worker #{process.pid}: running"

      # dependencies
      connect = require 'connect'
      express = require 'express'
      dobi = require './server'
      pkg = require path.join '..', 'package'

      # configuration
      app = express()
      app.use express.logger '[:date] :status :method :url'
      app.use connect.urlencoded()
      app.use connect.json()
      app.use express.methodOverride()
      app.use express.cookieParser()
      app.use dobi {
        firebase: config.firebase or null
        mongodb: config.mongo or null
        pkg_dir: path.join workspace, 'pkg'
        watch: process.env.CLUSTER_INDEX is '0'
      }
      app.use app.router
      app.use express.errorHandler {dumpExceptions: true, showStack: true}

      # listen
      app.listen pkg.config.port
      log "listening: #{pkg.config.port}"

  # setup a site using your app
  when 'setup'
    [id, version] = args[0].split '@'
    slug = args[1]

    exit "must specify package id" unless id
    exit "must specify package version" unless version
    exit "must specify new site slug" unless slug

    workspace = utils.getWorkspacePathSync()
    exit 'must be in a workspace to find your package' unless workspace

    # connect to database
    utils.connect (user, db) ->

      # make sure slug isn't taken
      db.get('sites').findOne {
        slug: slug
      }, (err, site) ->
        exit err if err
        exit "slug '#{slug}' is already taken." if site

        # read config.cson if it exists
        config_path = path.join workspace, 'pkg', id, version, 'config.cson'
        exists = fs.existsSync config_path
        pkg_config = {}
        pkg_config = CSON.parseFileSync config_path if exists

        # read setup.cson if it exists
        setup_path = path.join workspace, 'pkg', id, version, 'setup.cson'
        exists = fs.existsSync setup_path
        setup = {}
        setup = CSON.parseFileSync setup_path if exists

        # check validity of setup.cson
        setup.objects ?= []
        for object in setup.objects
          unless object.collection
            exit "object in setup.cson missing 'collection'"
          unless object.type
            exit "object in setup.cson missing 'type'"
          if not object.slug and object.slug != ''
            exit "object in setup.cson missing 'slug'"

        # update properties for this site
        site = extend true, {}, setup.site or {}, {
          created: Date.now()
          name: slug
          package:
            id: id
            version: version
          settings:
            domain:
              url: "http://www.lessthan3.com/#{slug}"
            transitions:
              mobile: 'slide'
              web: 'fade'
          slug: slug
        }

        # make user an admin
        site.users ?= {}
        site.users[user.admin_uid] = 'admin'

        # default site properties
        site.regions ?= {}
        site.style ?= {}
        site.collections ?= {}
        pkg_config.collections ?= {}
        for k, v of pkg_config.collections
          site.collections[k] ?= {}
          site.collections[k].slug ?= k

        # insert into database
        db.get('sites').insert site, (err, site) ->
          exit err if err
          site_id = site.get('_id').val()
          log 'site has been created'

          async.forEachSeries setup.objects, ((object, next) ->
            object.created = Date.now()
            object.site_id = site_id
            db.get('objects').insert object, (err) ->
              exit err if err
              next()
          ), (err) ->
            exit err if err
            log 'objects have been created'
            log 'loading site in just a moment'
            setTimeout ( ->
              open "http://www.lessthan3.com/#{slug}?dev=1"
              exit()
            ), 3000


  # daemonize a development server
  when 'start'
    utils.login (config) ->
      ((next) ->
        if config.pid
          log "killing running server: #{config.pid}" if config.pid
          try process.kill config.pid, 'SIGHUP'
          config.pid = null
          utils.saveUserConfig config, next
        else
          next()
      )( ->
        log "starting process"
        cp = require 'child_process'
        child = cp.spawn 'coffee', ["#{__dirname}/cli.coffee", 'run'], {
          detached: true
          stdio: [ 'ignore', 'ignore', 'ignore']
        }
        child.unref()
        config.pid = child.pid
        log "server running at: #{config.pid}"
        utils.saveUserConfig config, exit
      )

  # daemonize a development server
  when 'stop'
    utils.login (config) ->
      return exit() if not config.pid
      try process.kill config.pid, 'SIGHUP'
      config.pid = null
      utils.saveUserConfig config, exit

  # show usage
  when 'usage'
    exit USAGE

  # check your dobi version
  when 'version'
    pkg = require path.join '..', 'package'
    exit pkg.version

  # check your authentication status
  when 'whoami'
    utils.login ({user}) ->
      exit JSON.stringify user, null, 2 if user
      exit 'not logged in. try "dobi login"'

  # invalid command
  else
    log "invalid command: #{command}"
    exit USAGE
