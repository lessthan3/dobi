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


# usage
USAGE = """
Usage: dobi <command> [command-specific-options]

where <command> [command-specific-options] is one of:
  backup <site-slug>                backup a site
  cache:bust <site-slug>            clear the cache for a site
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
DATABASE_URL = 'http://www.dobi.io/db/1.0'
FIREBASE_URL = 'https://lessthan3.firebaseio.com'
USER_HOME = process.env.HOME or process.env.HOMEPATH or process.env.USERPROFILE
USER_CONFIG_PATH = "#{USER_HOME}/.lt3_config"

# helpers
rl = readline.createInterface {
  input: process.stdin
  output: process.stdout
}
XMLparser = new xml2js.Parser {explicitArray: false}



connect = (next) ->
  login ({token, user}) ->
    exit "please login first: 'dobi login'" unless user

    user.admin_uid = user.uid.replace /\./g, ','

    log 'connect to database'
    db = new mongofb.client.Database {
      server: DATABASE_URL
      firebase: FIREBASE_URL
    }
    db.cache = false
    user.token = token
    db.auth token, (err) ->
      exit "error authenticating" if err
      log 'connected'
      next user, db

exit = (msg) ->
  log msg if msg
  process.exit()

getWorkspacePath = (current, next) ->
  [current, next] = [CWD, current] if not next
  fs.exists path.join(current, 'dobi.json'), (exists) ->
    if exists
      next current
    else
      parent = path.join current, '..'
      return next null if parent is current
      getWorkspacePath parent, next

getWorkspacePathSync = (current=CWD) ->
  return current if fs.existsSync path.join(current, 'dobi.json')
  parent = path.join current, '..'
  return null if parent is current
  getWorkspacePathSync parent


log = (msg) ->
  console.log "[dobi] #{msg}"

logout = (next) ->
  saveUserConfig {}, ->
    next()

login = (require_logged_in, next) ->
  [require_logged_in, next] = [false, require_logged_in] unless next

  log 'authenticating user'
  readUserConfig (config) ->
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

readUserConfig = (next) ->
  fs.exists USER_CONFIG_PATH, (exists) ->
    if exists
      fs.readFile USER_CONFIG_PATH, 'utf8', (err, data) ->
        exit 'unable to read user config' if err
        next JSON.parse data
    else
      saveUserConfig {}, ->
        next {}

saveUserConfig = (data, next) ->
  config = JSON.stringify data
  fs.writeFile USER_CONFIG_PATH, config, 'utf8', (err) ->
    exit 'unable to write user config' if err
    next()

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
    connect (user, db) ->

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

    # connect to database
    connect (user, db) ->

      # get site
      log 'find the site'
      db.get('sites').findOne {
        slug: slug
      }, (err, site) ->
        exit err if err
        exit 'could not find site' unless site
        log "site found: #{site.get('_id').val()}"

        # clear cache
        api = 'http://www.lessthan3.com/pkg/lt3-api/4.0/api'
        resource = 'cache/bust'
        request {
          url: "#{api}/#{resource}"
          qs:
            site_id: site.get('_id').val()
            token: user.token
        }, (err, resp, body) ->
          exit err if err
          if resp.statusCode is 401
            exit 'You are not authorized to clear this cache'
          try
            body = JSON.parse body
            log "cache has been cleared for #{body.host}"
          catch err
            log 'failed to parse response'
          exit()

  # clear the cache for a site
  when 'cache:warm'
    TIME_START = Date.now()
    LAST_SCRIPT_LOADED = 0
    SCRIPT_LOAD_TIME = 0
    SECONDS_ELAPSED = 0
    DOMAIN = args[0]
    debug_mode = true if args[1] is 'debug'
    log 'DEBUG MODE' if debug_mode
    exit "must specify domain" unless DOMAIN
    PROCESSED_PACKAGE_SCRIPTS = []

    # connect to DB
    connect (user, db) ->

      DOMAIN = "http://#{DOMAIN}"
      RAW_DATA = {
        CACHE: {}
        ERRORS: []
        SCRIPTS_LOADED: 0
        SERVERS: {}
        SITES_PARSED: 0
        TIME: {}
      }

      # regular expresssions
      DOMAINtest = /^\/[^\/]/gi
      HTTPtest = /^https*/gi
      LT3test = /lessthan3.com/gi
      PKGtest = /(\/pkg\/.+\/.+)\//gi


      # request fn
      get = (url, next) ->
        if debug_mode
          time_start = Date.now() if debug_mode
          request {method: 'GET', url}, (err, resp, body) ->
            resp?.headers?.time = Date.now() - time_start
            next err, resp, body
        else
          request {method: 'GET', url}, next

      # update raw data
      cacheCount = (headers, type) ->
        x_cache = headers['x-cache']
        x_served_by = headers['x-served-by']

        RAW_DATA.CACHE[type] ?= {}
        RAW_DATA.CACHE[type].hit ?= 0
        RAW_DATA.CACHE[type].miss ?= 0

        RAW_DATA.SERVERS[x_served_by] ?= {}
        RAW_DATA.SERVERS[x_served_by].hit ?= 0
        RAW_DATA.SERVERS[x_served_by].miss ?= 0

        switch x_cache
          when 'HIT'
            RAW_DATA.CACHE[type].hit++
            RAW_DATA.SERVERS[x_served_by].hit++
          when 'MISS'
            RAW_DATA.CACHE[type].miss++
            RAW_DATA.SERVERS[x_served_by].miss++

        return unless debug_mode
        request_time = headers['time']
        RAW_DATA.TIME[type] ?= {}
        RAW_DATA.TIME[type].hit ?= []
        RAW_DATA.TIME[type].miss ?= []

        switch x_cache
          when 'HIT'
            RAW_DATA.TIME[type].hit.push request_time
          when 'MISS'
            RAW_DATA.TIME[type].miss.push request_time

      # get sitemap
      loadSitemap = (domain, next) ->
        log 'loading sitemap'
        get "#{domain}/sitemap.xml", (err, resp, body) ->
          return next err if err
          unless resp
            return next "no resp from domain"
          if resp.statusCode < 200 or resp.statusCode > 302
            return next "bad #{body}"
          next null, body

      # parse sitemap.xml for sites
      parseXML = (body, next) ->
        XMLparser.parseString body, (err, result) ->
          return next err if err
          sites = (loc for {loc} in result.urlset.url)
          return next() unless sites
          log "#{sites.length} site locations retrieved"
          next null, sites

      # query DB for domains of site slugs
      getSiteDomains = (sites, done) ->
        SLUGS = for site in sites
          slug_test = new RegExp "#{DOMAIN}/(.+)", "gi"
          slug = slug_test.exec(site)?[1]
          slug if slug

        getDomains = (next) ->
          DOMAINS = []
          db_sites = db.collection 'sites'

          db_sites.find {'slug': {$in: SLUGS}}, {
            limit: 100000
          }, (err, results) ->
            return next err if err
            for result in results
              continue if result is null
              url = result.val().settings?.domain?.url
              continue unless url
              url = "http://#{url}" unless url.match HTTPtest
              if url not in sites and not url.match LT3test
                DOMAINS.push url
                log "ADDING: #{url}"
            next null, DOMAINS

        loadDomainSitemap = (domains, done) ->
          SITES = []

          domain_iterator = (domain, next) ->
            async.waterfall [
              (_next) -> loadSitemap domain, _next
              (body, _next) -> parseXML body, _next
            ], (err, results) ->
              return next() unless results
              SITES.push result for result in results
              next()

          if debug_mode
            async.eachSeries domains, domain_iterator, -> done null, SITES
          else
            async.each domains, domain_iterator, -> done null, SITES

        async.waterfall [
          (next) -> getDomains next
          (domains, next) -> loadDomainSitemap domains, next
        ], (err, new_sites) ->
          sites.push site for site in new_sites
          done null, sites

      # request each HTML URL
      loadSites = (sites, done) ->
        SCRIPTS = []
        SCRIPT_URLS = []

        site_iterator = (site, next) =>
          get site, (err, resp, body) ->
            unless resp
              log "NO RESPONSE FROM #{site}".red
              return next()
            if resp.statusCode < 200 or resp.statusCode > 302 or err
              switch body
                when 'Unauthorized'
                  log "UNAUTHORIZED: #{site}".yellow
                else
                  log "ERROR: #{body}. skipping #{site}.".red
              return next()

            log "HTML RETRIEVED: #{site}"
            cacheCount resp.headers, 'HTML'

            RAW_DATA.SITES_PARSED++
            parser = new htmlparser.Parser {
              onopentag: (name, attribs) ->
                switch attribs.type
                  when 'text/css'
                    url = attribs.href
                    if url and url not in SCRIPT_URLS
                      script = {type: 'CSS', url, site}
                      SCRIPT_URLS.push url
                      if debug_mode
                        SCRIPTS.push script
                      else
                        getPackageScripts [script], (err, scripts) ->
                          loadScripts scripts
                  when 'text/javascript'
                    url = attribs.src
                    if url and url not in SCRIPT_URLS
                      script = {type: 'JS', url, site}
                      SCRIPT_URLS.push url
                      if debug_mode
                        SCRIPTS.push script
                      else
                        getPackageScripts [script], (err, scripts) ->
                          loadScripts scripts
              onend: ->
                next()
            }
            parser.write body
            parser.end()

        if debug_mode
          async.eachSeries sites, site_iterator, -> done null, SCRIPTS
        else
          async.each sites, site_iterator, -> done null, []


      # create URLs for package/main.js
      getPackageScripts = (scripts, next) ->
        return next() unless scripts
        for script in scripts
          {url, type, site} = script
          continue unless type is 'CSS'
          pkg = PKGtest.exec(url)?[1]
          continue unless pkg
          pkg_JS = "#{pkg}/main.js"
          if pkg_JS not in PROCESSED_PACKAGE_SCRIPTS
            scripts.push {site, type: 'JS', url: pkg_JS}
            PROCESSED_PACKAGE_SCRIPTS.push pkg_JS

        next null, scripts

      # request CSS and JS scripts
      loadScripts = (scripts = [], done) ->
        return done() unless scripts
        script_iterator = (script, next) ->
          return next() unless script
          {url, type, site} = script
          if url.match DOMAINtest
            url = "#{DOMAIN}#{url}"
          else unless url.match HTTPtest
            url = "http:#{url}"
          get url, (err, resp, body) ->
            if err or resp?.statusCode < 200 or resp?.statusCode > 302
              RAW_DATA.ERRORS.push {
                error: err
                body: body
                site: site
                url: url
                response: resp?.statusCode
              }
              return next()

            log "#{type} RETRIEVED: #{site}".green
            cacheCount resp.headers, type

            RAW_DATA.SCRIPTS_LOADED++
            LAST_SCRIPT_LOADED = Date.now()
            next()

        if debug_mode
          async.eachSeries scripts, script_iterator, done
        else
          async.each scripts, script_iterator, done

      # format errors to github markup, copy to clipboard
      compileErrors = (next) ->
        {ERRORS} = RAW_DATA
        return next() unless ERRORS.length > 0
        err_format = "```js\n#{JSON.stringify ERRORS, null, 2}\n```"
        clipboard.copy err_format, ->
          log "Errors copied to clipboard"
          next()

      # compile raw data to pretty tables
      compileData = (next) ->
        SECONDS_ELAPSED = Math.floor (Date.now() - TIME_START) / 1000
        SCRIPT_LOAD_TIME = Math.floor (LAST_SCRIPT_LOADED - TIME_START) / 1000
        data_config = {
          'cache:warm':
            data: {
              'SITES LOADED': RAW_DATA.SITES_PARSED
              'SCRIPTS LOADED': RAW_DATA.SCRIPTS_LOADED
              'SCRIPT ERRORS': RAW_DATA.ERRORS.length
            }
            format:
              columns: ['metric', 'count']
              columnSplitter: ' | '
            prepare: (data) ->
              result = []
              for metric, count of data
                result.push {metric, count}
              return result

          cache:
            data: RAW_DATA.CACHE
            format:
              columns: ['type', 'hit', 'miss']
              columnSplitter: ' | '
            prepare: (data) ->
              result = []
              for type, {hit, miss} of data
                result.push {type, hit, miss}
              return result

          server:
            data: RAW_DATA.SERVERS
            format:
              columns: ['server', 'hit', 'miss']
              columnSplitter: ' | '
            prepare: (data) ->
              result = []
              for server, {hit, miss} of data
                continue unless server isnt 'undefined'
                result.push {server, hit, miss}
              result = result.sort (a, b) ->
                return 1 if a.server > b.server
                return -1 if a.server < b.server
                return 0
              return result
        }

        if debug_mode
          data_config.time = {
            data: RAW_DATA.TIME
            format:
              columns: ['type', 'hit', 'miss']
              columnSplitter: ' | '
            prepare: (data) ->
              result = []
              timeAvg = (times) ->
                times ?= []
                average = 0
                average += time for time in times
                average /= times.length if average > 0
                return "#{Math.floor average}ms"
              for type, {hit, miss} of data
                metrics = {type}
                for TYPE in ['hit', 'miss']
                  metrics[TYPE] = timeAvg data[type][TYPE]
                result.push metrics
              return result
          }

        metrics = []
        for metric, methods of data_config
          {data, format, prepare} = methods
          metrics.push {
            title: "#{metric.toUpperCase()} STATS"
            table: columnify prepare(data), format
          }

        next null, metrics

      # CACHE:WARM STARTS HERE
      async.waterfall [
        (next) -> loadSitemap DOMAIN, next
        (body, next) -> parseXML body, next
        (sites, next) -> getSiteDomains sites, next
        (sites, next) -> loadSites sites, next
        (scripts, next) -> getPackageScripts scripts, next
        (scripts, next) -> loadScripts scripts, next
        (next) -> compileErrors next
        (next) -> compileData next
      ], (err, metrics) ->
        exit err if err
        border = '= = = = = = = = = = = = = = = = = = = = = = = ='
        output = ['CACHE:WARM COMPLETE', border, '']
        for {title, table} in metrics
          output = output.concat([title, table, ''])
        output.push "SCRIPTS LOAD TIME: #{SCRIPT_LOAD_TIME} seconds"
        output.push "TOTAL RUN TIME: #{SECONDS_ELAPSED} seconds"
        log output.join '\n'
        process.exit()

  # clone a site
  when 'clone'
    src_slug = args[0]
    dst_slug = args[1]

    # check arguments
    exit "must specify site src_slug" unless src_slug
    exit "must specify site dst_slug" unless dst_slug

    # connect to database
    connect (user, db) ->

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
            db.get('sites').insert site, (err, dst_site) ->
              exit err if err

              # insert pages
              async.forEach objects, ((object, next) ->
                data = object.val()
                delete data._id
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
    login ({user}) ->
      exit "please login first: 'dobi login'" unless user

      # bootstrap the package
      source = path.join __dirname, '..', 'bootstrap', type
      workspace = getWorkspacePathSync()
      exit 'must be in a workspace to create a package' unless workspace
      dest = path.join workspace, 'pkg', id, version
      mkdirp dest, (err) ->
        exit "error creating package: #{err}" if err
        ncp source, dest, (err) ->
          exit "Error creating package: #{err}" if err

          # update config
          config_path = path.join dest, 'config.cson'
          config = CSON.parseFileSync config_path
          config.id = id
          config.version = version
          config.author = {name: user.name, email: user.email}
          config.developers = {}
          config.developers[user.admin_uid] = 'admin'
          config = CSON.stringifySync(config).replace /\n\n/g, '\n'
          fs.writeFileSync config_path, config

          # done
          exit 'package created successfully'


  # deploy an app
  when 'deploy'
    [id, version] = args[0].split '@'

    # check arguments
    exit "must specify package id" unless id
    exit "must specify package version" unless version

    workspace = getWorkspacePathSync()
    exit 'must be in a workspace to deploy your package' unless workspace

    # read config.cson
    log "deploying #{id}@#{version}"
    package_path = path.join workspace, 'pkg', id, version
    config_path = path.join package_path, 'config.cson'
    exists = fs.existsSync config_path
    exit 'package config.cson does not exist' unless exists
    config = CSON.parseFileSync config_path if exists
    config.files = []
    config.private ?= false

    # legacy
    delete config.changelog

    # load files
    log "loading files"
    finder = findit package_path
    finder.on 'file', (file, stat) ->
      data = fs.readFileSync(file).toString 'base64'
      config.files.push {
        data: data
        ext: path.extname(file).replace /^\./, ''
        md5: crypto.createHash('md5').update(data).digest('hex')
        name: path.basename file
        path: file.replace "#{package_path}/", ''
        size: stat.size
      }
    finder.on 'end', ->

      # sort files so md5 is consistent
      config.files.sort (a, b) -> if a.path > b.path then 1 else -1

      # update md5
      data = JSON.stringify config
      config.md5 = crypto.createHash('md5').update(data).digest('hex')

      # connect to database
      connect (user, db) ->

        # make sure user is an admin
        config.developers ?= {}
        config.developers[user.admin_uid] = 'admin'

        # update main config
        ((next) ->
          log 'loading package config'
          db.get('packages_config').findOne {
            id: id
          }, (err, pkg_config) ->
            exit err if err

            # updating config
            if pkg_config
              if not pkg_config.get("developers.#{user.admin_uid}").val() == 'admin'
                exit "you don't have permission to deploy this package"
              config._id = pkg_config.get('_id').val()
              log 'updating package config'
              pkg_config.set config, (err) ->
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
            config.config_id = config._id
            delete config._id

            ###
            # temp hack: allow package overwrite
            ###
            if pkg
              log 'package exists. overwriting'
              config._id = pkg.get('_id').val()
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
    workspace = getWorkspacePathSync()
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
    results = []
    workspace = getWorkspacePathSync()
    exit 'must be in a workspace to lint your package' unless workspace
    package_path = path.join workspace, 'pkg', id, version
    finder = findit package_path
    finder.on 'file', (file, stat) ->
      ext = path.extname(file).replace /^\./, ''
      return unless ext is 'coffee'

      # lint if no individual file specified, or if we match the target file
      if not target or target is path.basename file
        results.push {
          file: file
          errors: coffeelint.lint fs.readFileSync(file, 'utf8'), config
        }
    finder.on 'end', ->

      success = true
      for result in results
        continue unless result.errors.length > 0
        log result.file.green
        for err in result.errors
          success = false
          color = if err.level is 'error' then 'red' else 'yellow'
          line_number = "##{err.lineNumber}"
          indent = '' ; indent += ' ' for i in [0...line_number.length + 2]
          err.line = "#{err.line.replace /\s*(.*)/, "#{indent}$1"}" if err.line
          err.context = if err.context then ": #{err.context}" else ''
          log "#{line_number[color]}: #{err.message}#{err.context}"
          log err.line.cyan if err.line
          log ''

      if success
        log 'Success! This package is lint free.'.green
      exit()

  # authenticate your user
  when 'login'
    logout ->
      login true, ({user}) ->
        exit JSON.stringify user, null, 2 if user
        exit 'not logged in. try "dobi login"'

  # deauthenticate your user
  when 'logout'
    logout ->
      exit 'you are now logged out'

  # open a site
  when 'open'
    url = 'http://www.lessthan3.com'
    url += "/#{arg}" for arg in args
    open url
    exit()

  # run a development server
  when 'run'
    workspace = getWorkspacePathSync()
    exit 'must be in a workspace to run the server' unless workspace

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
      pkg_dir: path.join workspace, 'pkg'
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

    workspace = getWorkspacePathSync()
    exit 'must be in a workspace to find your package' unless workspace

    # connect to database
    connect (user, db) ->

      # make sure slug isn't taken
      db.get('sites').findOne {
        slug: slug
      }, (err, site) ->
        exit err if err
        exit "slug '#{slug}' is already taken." if site

        # read config.cson if it exists
        config_path = path.join workspace, 'pkg', id, version, 'config.cson'
        exists = fs.existsSync config_path
        config = {}
        config = CSON.parseFileSync config_path if exists

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
        config.collections ?= {}
        for k, v of config.collections
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
    login (config) ->
      ((next) ->
        if config.pid
          log "killing running server: #{config.pid}" if config.pid
          try process.kill config.pid, 'SIGHUP'
          config.pid = null
          saveUserConfig config, next
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
        saveUserConfig config, exit
      )

  # daemonize a development server
  when 'stop'
    login (config) ->
      return exit() if not config.pid
      try process.kill config.pid, 'SIGHUP'
      config.pid = null
      saveUserConfig config, exit

  # show usage
  when 'usage'
    exit USAGE

  # check your dobi version
  when 'version'
    pkg = require path.join '..', 'package'
    exit pkg.version

  # check your authentication status
  when 'whoami'
    login ({user}) ->
      exit JSON.stringify user, null, 2 if user
      exit 'not logged in. try "dobi login"'

  # invalid command
  else
    log "invalid command: #{command}"
    exit USAGE
