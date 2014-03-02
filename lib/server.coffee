# Dependencies
async = require 'async'
chokidar = require 'chokidar'
CSON = require 'cson'
Firebase = require 'firebase'
express = require 'express'
fs = require 'fs'
LRU = require 'lru-cache'
path = require 'path'
wrap = require 'asset-wrap'


# Exports
exports = module.exports = (cfg) ->


  # Settings
  _cache = new LRU {max: 50, maxAge: 1000*60*5}
  prod = process.env.LT3_ENV == 'prod'
  use_cache = prod
  use_compression = prod
  pkg_dir = cfg.pkg_dir or path.join __dirname, '..', '..', '..', 'pkg'


  # Local Deveopment Variables
  firebase = null
  user = null



  # get the absolute directory of the specified package
  pkgDir = (id, version) ->
    path.join pkg_dir, id, version

  # read a CSON file amd make sure it exists
  readCSON = (file, next) ->
    fs.exists file, (exists) ->
      if exists
        CSON.parseFile file, next
      else
        next "#{file} does not exist"

  # read a full package config
  readConfig = (id, version, next) ->
    root = path.join pkgDir(id, version)
    readCSON path.join(root, 'config.cson'), (err, config) ->
      return next err if err
      next null, config

  # read package schema
  readSchema = (id, version, next) ->
    root = path.join pkgDir(id, version)
    schema = {}
    readConfig id, version, (err, config) ->
      return next err if err
      
      # TODO (remove): backwards compatibility
      schema = config.pages if config.pages
      schema = config.settings if config.settings

      readSchemaDirectory root, 'models', schema, (err) ->
        readSchemaDirectory root, 'schema', schema, (err) ->
          return next err if err
          next null, schema
      
  # read all schema files from a direcotory
  readSchemaDirectory = (root, dir, schema, next) ->

    # check for models directory
    fs.exists path.join(root, dir), (exists) ->
      return next() unless exists

      # read in the models
      fs.readdir path.join(root, dir), (err, files) ->
        return next err if err
        files = (path.join(root, dir, file) for file in files)
        async.each files, ((file, next) ->
          key = path.basename file, '.cson'
          readCSON file, (err, model) ->
            schema[key] = model
            next err
        ), (err) ->
          return next err if err
          next()

  # create a list of Snockets instances for the needed files
  gatherJS = (ignore, id, version, next) ->
    for i in ignore
      return next(null, []) if [id, version] is i

    # read config
    readConfig id, version, (err, config) ->
      return next err if err
      readSchema id, version, (err, schema) ->
        return next err if err

        root = pkgDir id, version

        # get dependencies
        ignore.push [id, version]
        config.dependencies ?= {}
        deps = ([id, version] for id, version of config.dependencies)

        async.map deps, (([id, version], callback) ->
          gatherJS ignore, id, version, callback
        ), (err, dep_assets) ->
          return next err if err
          
          assets = []
          assets = assets.concat a for a in dep_assets

          add = (src) ->
            return unless src
            return unless fs.existsSync src
            return unless fs.lstatSync(src).isFile()
            return unless path.extname(src) in ['.js', '.coffee']
            return if path.basename(src) in ['api.coffee']

            asset = new wrap.Snockets {src: src}
            asset.config = config
            asset.schema = schema
            asset.page = path.basename src, '.coffee' # TODO: deprecate
            asset.name = path.basename src, '.coffee'
            assets.push asset

          # if main.js defined, only load that
          if config.main?.js
            add path.join(root, config.main?.js or '')
            next null, assets
            return

          checkDirectory = (d, next) ->
            fs.readdir path.join(root, d), (err, files) ->
              files ?= []
              add path.join(root, d, f) for f in files
              next()

          checkDirectory '', ->
            checkDirectory 'templates', ->
              checkDirectory 'presenters', ->
                checkDirectory 'views', ->
                  checkDirectory 'pages', ->
                    next null, assets

  wrapJS = (list, next) ->
    js = new wrap.Assets list, {
      compress: use_compression
    }, (err) =>
      return next err.toString() if err
      try
        header = ""

        checked = []
        check = (str, data=null) ->
          return '' if checked[str]
          checked[str] = 1
          result = ";if(#{str}==null){#{str}={};};"
          result += "#{str}=#{JSON.stringify data};" if data
          result

        for a in js.assets
          u = "window.lt3"
          v = "lt3.pkg"
          w = "lt3.pkg['#{a.config.id}']"
          x = "#{w}['#{a.config.version}']"
          y = "#{x}.Presenters"
          z = "#{x}.Templates"
          z2 = "#{x}.Pages" # TODO: deprecate

          header += check(u) + check(v) + check(w) + check(x) + check(y)
          header += check("#{x}.config", a.config)
          header += check("#{x}.schema", a.schema)
          header += check(z)
          header += check(z2) # TODO: deprecate

          substitutions = [
            ['exports.App', "#{y}['#{a.name}'] = #{x}.App"]
            ['exports.Header', "#{y}['#{a.name}'] = #{x}.Header"]
            ['exports.Footer', "#{y}['#{a.name}'] = #{x}.Footer"]
            ['exports.Component', "#{y}['#{a.name}'] = #{x}.Component"]
            ['exports.Template', "#{z}['#{a.name}']"]
            ['exports.Page', "#{y}['#{a.name}'] = #{z2}['#{a.name}']"]
          ]
          for sub in substitutions
            a.data = a.data.replace sub[0], sub[1]
        asset = js.merge (err) ->
          next err, header + asset.data
      catch err
        next err.stack

  gatherCSS = (ignore, id, version, next) ->
    for i in ignore
      return next(null, []) if [id, version] is i


    # read config
    readConfig id, version, (err, config) ->
      return next err, null if err

      root = pkgDir id, version

      # get dependencies
      ignore.push [id, version]
      config.dependencies ?= {}
      deps = ([id, version] for id, version of config.dependencies)
      async.map deps, (([id, version], callback) ->
        gatherCSS ignore, id, version, callback
      ), (err, dep_assets) ->
        return next err if err

        add = (src) ->
          return unless src
          return unless fs.existsSync src
          return unless fs.lstatSync(src).isFile()
          return unless path.extname(src) in ['.css', '.styl']

          ext = path.extname(src)
          if ext is '.css'
            asset = new wrap.CSS {src: src}
          else if ext is '.styl'
            asset = new wrap.Stylus {src: src}
          asset.config = config
          assets.push asset

        assets = []
        config.main ?= {css: 'style.styl'}
        add path.join(root, config.main.css) if config.main.css

        checkDirectory = (d, next) ->
          fs.readdir path.join(root, d), (err, files) ->
            files ?= []
            add path.join(root, d, f) for f in files
            next()
        
        checkDirectory 'style', ->
          assets = assets.concat a for a in dep_assets

          # sort so that theme.styl and app.styl are first
          # so that they can import fonts
          assets.sort (a, b) ->
            x = path.basename(a.src)
            y = path.basename(b.src)
            return -1 if x is 'theme.styl'
            return 1 if y is 'theme.styl'
            return -1 if x is 'app.styl'
            return 1 if y is 'app.styl'
            return 0
          next null, assets

  wrapCSS = (list, query, next) ->
    css = new wrap.Assets list, {
      compress: use_compression
      vars: query
      vars_prefix: '$'
    }, (err) =>
      return next err if err
      try
        for a in css.assets
          v = ".#{a.config.id}.v#{a.config.version.replace /\./g, '-'}"
          a.data = a.data.replace /.exports/g, v
        asset = css.merge (err) ->
          next err, asset.data
      catch err
        next err


  # Watch For File Changes
  unless prod
    watcher = chokidar.watch pkg_dir, {
      ignored: /(^\.|\.swp$|\.tmp$|~$)/
    }
    watcher.on 'change', (filepath) ->
      filepath = filepath.replace pkg_dir, ''
      re = /^[\/\\]([^\/\\]*)[\/\\]([^\/\\]*)[\/\\](.*)$/
      [filepath, id, version, file] = filepath.match(re) or []
      console.log "#{id} v#{version} updated"
      if user
        readConfig id, version, (err, config) ->
          return error 400, err if err
          delete config.changelog
          ref = firebase.child "users/#{user}/developer/listener"
          config.modified =
            time: Date.now()
            file: path.basename file
            file_ext: path.extname(file).replace '.', ''
            file_name: path.basename file, path.extname(file)
          ref.set config


  # Middleware
  (req, res, next) ->

    # Helpers
    cacheHeaders = (age) ->
      val = "private, max-age=0, no-cache, no-store, must-revalidate"
      if use_cache
        [num, type] = [age, 'seconds']
        if typeof age == 'string'
          [num, type] = age.split ' '
          num = parseInt num, 10
        if num == 0
          val = 'private, max-age=0, no-cache, no-store, must-revalidate'
        else
          switch type
            when 'minute', 'minutes'  then num *= 60
            when 'hour', 'hours'      then num *= 3600
            when 'day', 'days'        then num *= 86400
            when 'week', 'weeks'      then num *= 604800
          val = "public, max-age=#{num}, must-revalidate"
      res.set 'Cache-Control', val

    cache = (options, fn) ->
      # options
      unless fn
        fn = options
        options = {age: '10 minutes'}

      if typeof options is 'string'
        options = {age: options}

      # headers
      cacheHeaders options.age

      # response
      url = if options.qs then req.url else req._parsedUrl.pathname
      key = "#{req.protocol}://#{req.host}#{url}"
      if prod and _cache.has key
        res.send _cache.get key
      else
        fn (data) =>
          _cache.set key, data
          res.send data

    contentType = (type) ->
      res.set 'Content-Type', type

    error = (code, msg) ->
      unless msg
        switch code
          when 400 then msg = 'Bad Request'
          when 404 then msg = 'Page Not Found'
          when 500 then msg = 'Internal Server Error'

      console.error """

      === ERROR: #{code} ===
      """
      res.send code, msg
      console.error """
      ===
      #{msg}
      === END ERROR ===

      """


    # Routes
    router = new express.Router()

    # Access Control Allow Origin
    router.route 'GET', '*', (req, res, next) ->
      res.header "Access-Control-Allow-Origin", "*"
      next()

    # Development Token
    unless prod
      router.route 'GET', '/connect', (req, res, next) ->
        token = req.query.token
        firebase = new Firebase 'https://lessthan3.firebaseio.com'
        firebase.auth token, (err, data) ->
          return error 400 if err
          user = req.query.user._id

          pkgs = {}
          for i, id of fs.readdirSync pkg_dir
            pkgs[id] = {}
            pkg_path = "#{pkg_dir}/#{id}"
            continue unless fs.lstatSync(pkg_path).isDirectory()
            for i, version of fs.readdirSync pkg_path
              pkgs[id][version] = 1
          res.send pkgs

    # Package Config
    router.route 'GET', '/pkg/:id/:version/config.json', (req, res, next) ->
      contentType 'application/json'
      cache {age: '10 minutes'}, (next) =>
        readConfig req.params.id, req.params.version, (err, data) ->
          return error 400, err if err
          res.send data

    # Package Schema
    router.route 'GET', '/pkg/:id/:version/schema.json', (req, res, next) ->
      contentType 'application/json'
      cache {age: '10 minutes'}, (next) =>
        readSchema req.params.id, req.params.version, (err, data) ->
          return error 400, err if err
          res.send data

    # Package Javascript
    router.route 'GET', '/pkg/:id/:version/main.js', (req, res, next) ->
      contentType 'text/javascript'
      cache {age: '10 minutes'}, (next) =>
        gatherJS [], req.params.id, req.params.version, (err, assets) ->
          return error 400, err if err
          wrapJS assets, (err, data) ->
            return error 400, err if err
            next data

    # Package Stylesheet
    router.route 'GET', '/pkg/:id/:version/style.css', (req, res, next) ->
      contentType 'text/css'
      cache {age: '10 minutes', qs: true}, (next) =>
        gatherCSS [], req.params.id, req.params.version, (err, assets) ->
          return error 400, err if err
          wrapCSS assets, req.query, (err, data) ->
            return error 400, err if err
            next data

    # Public/Static Files
    router.route 'GET', '/pkg/:id/:version/public/*', (req, res, next) ->
      id = req.params.id
      version = req.params.version
      file = req.params[0]
      filepath = path.join "#{pkgDir id, version}", 'public', file
      fs.exists filepath, (exists) ->
        if exists
          res.sendfile filepath, {maxAge: 1000*60*5}
        else
          error 404, "File #{file} does not exists"

    # API Calls
    apiCallHandler = (req, res, next) ->
      id = req.params.id
      method = req.params[0]
      version = req.params.version

      package_path = path.join "#{pkgDir id, version}"
      api_path = path.join package_path, 'api.coffee'

      # don't cache api.coffee files on dev
      if not prod
        if require.cache[api_path]
          for child in require.cache[api_path].children
            delete require.cache[child.id]
          delete require.cache[api_path]

      svr = require api_path
      return error 404 unless svr?[method]
      svr[method].apply {
        body: req.body
        cache: cache
        error: error
        query: req.query
        req: req
        res: res
      }
    router.route 'GET', '/pkg/:id/:version/api/*', apiCallHandler
    router.route 'POST', '/pkg/:id/:version/api/*', apiCallHandler

    # Execute Routes
    router._dispatch req, res, next
