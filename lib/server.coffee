# Dependencies
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
  logger = if prod then 'default' else 'dev'
  useCache = prod
  useCompression = prod
  pkg_dir = cfg.pkg_dir or path.resolve "#{__dirname}/../../../pkg"


  # Local Deveopment Variables
  firebase = null
  user = null


  # Helpers
  package_dir = (id, version) ->
    path.resolve "#{pkg_dir}/#{id}/#{version}"

  read_package = (id, version) ->
    root = package_dir id, version
    if fs.existsSync "#{root}/config.cson"
      return CSON.parseFileSync "#{root}/config.cson"
    if fs.existsSync "#{root}/package.cson"
      return CSON.parseFileSync "#{root}/package.cson"
    else if fs.existsSync "#{root}/package.coffee"
      return require("#{root}/package.coffee").package


  # Watch For File Changes
  if not prod
    watcher = chokidar.watch pkg_dir, {
      ignored: /(^\.|\.swp$|\.tmp$|~$)/
    }
    watcher.on 'change', (path) ->
      path = path.replace pkg_dir, ''
      re = /^[\/\\]([^\/\\]*)[\/\\]([^\/\\]*)[\/\\].*$/
      [path, id, version] = path.match(re) or []
      console.log "#{id} v#{version} updated"
      if user
        pkg = read_package id, version
        return if not pkg
        delete pkg.changelog
        ref = firebase.child "users/#{user}/developer/listener"
        pkg.modified = Date.now()
        ref.set pkg
 

  # Middleware
  (req, res, next) ->

    # Helpers
    cacheHeaders = (age) ->
      val = "private, max-age=0, no-cache, no-store, must-revalidate"
      if useCache
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
      if not fn
        fn = options
        options = {age: '10 minutes'}

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
      if not msg
        switch code
          when 400 then msg = 'Bad Request'
          when 404 then msg = 'Page Not Found'
          when 500 then msg = 'Internal Server Error'
      res.send code, msg


    # Routes
    router = new express.Router()

    # Access Control Allow Origin
    router.route 'GET', '*', (req, res, next) ->
      res.header "Access-Control-Allow-Origin", "*"
      next()

    # Development Token
    router.route 'GET', '/local-dev/setToken', (req, res, next) ->
      token = req.query.token
      firebase = new Firebase 'https://lessthan3.firebaseio.com'
      firebase.auth token, (err, data) ->
        return res.send 400 if err
        user = req.query.user._id
        res.send 200

    # Package Info
    router.route 'GET', '/pkg/:id/:version/package.json', (req, res, next) ->
      contentType 'application/json'
      cache {age: '10 minutes'}, (next) =>
        next read_package req.params.id, req.params.version

    # Package Javascript
    router.route 'GET', '/pkg/:id/:version/main.js', (req, res, next) ->
      contentType 'text/javascript'
      cache {age: '10 minutes'}, (next) =>
        build = (id, version) ->
          root = package_dir id, version
          pkg = read_package id, version
          js = []
          
          return js if not pkg
          if pkg.dependencies
            js = js.concat(build(k, v)) for k, v of pkg.dependencies

          add = (src, page=null) ->
            return if not src
            return if not fs.existsSync src
            asset = new wrap.Snockets {src: src}
            asset.pkg = pkg
            asset.page = page
            js.push asset

          add "#{root}/main.coffee"
          add "#{root}/#{pkg.type}.coffee"
          add "#{root}/#{pkg.main?.js}"
          if pkg.type == 'app' and pkg.pages
            for type of pkg.pages
              add "#{root}/pages/#{type}.coffee", type
          js

        js = new wrap.Assets build(req.params.id, req.params.version), {
          compress: useCompression
        }, (err) =>
          return error 500, err.toString() if err
          try
            header = ""
            for a in js.assets
              x = "lt3.pkg['#{a.pkg.id}']"
              y = "#{x}['#{a.pkg.version}']"
              z = "#{y}.Pages"

              check = (str) -> ";if(#{str}==null){#{str}={};};"
              if not a.page
                header += check(x) + check(y)
                header += check(z) if a.pkg.type == 'app'
                header += "#{y}.package = #{JSON.stringify a.pkg};"
              a.data = a.data.replace 'exports.App', "#{y}.App"
              a.data = a.data.replace 'exports.Header', "#{y}.Header"
              a.data = a.data.replace 'exports.Footer', "#{y}.Footer"
              a.data = a.data.replace 'exports.Component', "#{y}.Component"
              a.data = a.data.replace 'exports.Page', "#{z}['#{a.page}']"
            asset = js.merge (err) ->
              next header + asset.data
          catch err
            error 500, err.stack

    # Package Stylesheet
    router.route 'GET', '/pkg/:id/:version/style.css', (req, res, next) ->
      contentType 'text/css'
      cache {age: '10 minutes'}, (next) =>
        # todo: build dependency graph to not have double imports
        # or import in the wrong order
        build = (id, version) ->
          root = package_dir id, version
          pkg = read_package id, version
          pkg.main ?= {css: 'style.styl'}
          css = []

          return css if not pkg
          if pkg.dependencies
            css = css.concat(build(k, v)) for k, v of pkg.dependencies
          if pkg.main.css
            asset = new wrap.Stylus {
              src: "#{root}/#{pkg.main.css}"
            }
            asset.pkg = pkg
            css.push asset
          css

        css = new wrap.Assets build(req.params.id, req.params.version), {
          compress: useCompression
        }, (err) =>
          return error 500, err.toString() if err
          try
            for a in css.assets
              v = ".#{a.pkg.id}.v#{a.pkg.version.replace /\./g, '-'}"
              a.data = a.data.replace /.exports/g, v
            asset = css.merge (err) ->
              next asset.data
          catch err
            error 500, err.stack

    # Public/Static Files
    router.route 'GET', '/pkg/:id/:version/public/*', (req, res, next) ->
      id = req.params.id
      version = req.params.version
      file = req.params[0]
      res.sendfile "#{package_dir id, version}/public/#{file}"

    # API Calls
    router.route 'GET', '/pkg/:id/:version/api/:method', (req, res, next) ->
      id = req.params.id
      method = req.params.method
      version = req.params.version
      svr = require "#{package_dir id, version}/api.coffee"
      return error 404 if not svr?[method]
      svr[method].apply {
        cache: cache
        error: error
        query: req.query
        req: req
        res: res
      }

    # Execute Routes
    router._dispatch req, res, next
