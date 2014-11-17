
# dependencies
Firebase = require 'firebase'
async = require 'async'
colors = require 'colors'
columnify = require 'columnify'
clipboard = require('copy-paste').noConflict()
fs = require 'fs'
htmlparser = require 'htmlparser2'
mongofb = require 'mongofb'
open = require 'open'
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

exit = (msg) ->
  log msg if msg
  process.exit()

log = (msg) ->
  console.log "[dobi] #{msg}"

# constants
CWD = process.cwd()
DATABASE_URL = 'http://www.dobi.io/db/1.0'
FIREBASE_URL = 'https://lessthan3.firebaseio.com'
USER_HOME = process.env.HOME or process.env.HOMEPATH or process.env.USERPROFILE
USER_CONFIG_PATH = "#{USER_HOME}/.lt3_config"

module.exports =

  cacheBust: ({slug, domain}, done) ->

    # connect to database
    @connect (user, db) ->

      getSite = (next) ->
        if slug
          db.get('sites').findOne {
            slug: slug
          }, next
        else if domain
          db.get('sites').findOne {
            'settings.domain.url': domain
          }, next

      # get site
      log 'find the site'
      getSite (err, site) ->
        return done err if err
        return done 'could not find site' unless site
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
          return done err if err
          if resp.statusCode is 401
            return done 'You are not authorized to clear this cache'
          try
            body = JSON.parse body
            log "cache has been cleared for #{body.host}".green
          catch err
            return done 'failed to parse response'
          done()

  cacheWarm: ({DOMAIN, debug_mode}, done) ->
    TIME_START = Date.now()
    PROCESSED_PACKAGE_SCRIPTS = []
    LAST_SCRIPT_LOADED = 0
    SCRIPT_LOAD_TIME = 0
    SECONDS_ELAPSED = 0
    RATE_LIMIT = 15

    # connect to DB
    @connect (user, db) ->

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
            async.eachLimit domains, RATE_LIMIT, domain_iterator, -> done null, SITES

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
        COMPLETE = false

        q = async.queue (task, next) ->
          getPackageScripts [task.script], (err, scripts) ->
            loadScripts scripts, ->
              setTimeout (-> next()), 500

        q.drain = ->
          callback = ->
            if COMPLETE
              done null, []
            else
              setTimeout (-> callback()), 500
          callback()

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
                        SCRIPTS.push {type: 'JS', url, site}
                      else
                        q.push {script}
              onend: ->
                next()
            }
            parser.write body
            parser.end()

        if debug_mode
          async.eachSeries sites, site_iterator, -> done null, SCRIPTS
        else
          async.eachLimit sites, RATE_LIMIT, site_iterator, ->
            COMPLETE = true

      # create URLs for package/main.js
      getPackageScripts = (scripts, next) ->
        return next() unless scripts
        for script in scripts
          {url, type, site} = script
          continue unless type is 'CSS'
          pkg = PKGtest.exec(url)?[1]
          continue unless pkg
          pkg_JS = ["#{pkg}/main.js", "#{pkg}/main.js?_mongoWarming_=1823"]
          for JS in pkg_JS
            continue if JS in PROCESSED_PACKAGE_SCRIPTS
            scripts.push {site, type: 'JS', url: JS}

        next null, scripts

      # request CSS and JS scripts
      loadScripts = (scripts = [], done) ->
        return done() unless scripts
        script_iterator = (script, next) ->
          {url, type, site} = script or {}
          return next() unless script
          return next() if url in PROCESSED_PACKAGE_SCRIPTS
          PROCESSED_PACKAGE_SCRIPTS.push url

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
          async.eachLimit scripts, RATE_LIMIT, script_iterator, done

      # format errors to github markup, copy to clipboard
      compileErrors = (next) ->
        {ERRORS} = RAW_DATA
        return next() unless ERRORS.length > 0
        err_format = "```js\n#{JSON.stringify ERRORS, null, 2}\n```"
        clipboard.copy err_format, ->
          log "Errors copied to clipboard".red
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
        return done err if err
        data = {
          metrics: metrics
          times: {SCRIPT_LOAD_TIME, SECONDS_ELAPSED}
        }
        done null, data

  connect: (next) ->
    @login ({token, user}) ->
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
        setTimeout ( =>
          url = 'http://www.dobi.io/auth'
          request {url}, (err, resp, body) =>
            if body.match /not found/gi
              url = 'http://www.lessthan3.com/developers/auth'
            open url
            rl.question "Enter Token: ", (token) =>
              exit 'must specify token' unless token
              fb = new Firebase FIREBASE_URL
              fb.auth token, (err, data) =>
                exit 'invalid token' if err
                config.user = data.auth
                config.token = token
                config.token_expires = data.expires
                @saveUserConfig config, ->
                  next config
        ), 3000

  logout: (next) ->
    @saveUserConfig {}, next

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

