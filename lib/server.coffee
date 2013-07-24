# dependencies
chokidar = require 'chokidar'
CSON = require 'cson'
Firebase = require 'firebase'
express = require 'express'
fs = require 'fs'
LRU = require 'lru-cache'
path = require 'path'
wrap = require 'asset-wrap'

# helpers
package_dir = (id, version) ->
  path.resolve "#{__dirname}/../../pkg/#{id}/#{version}"

read_package = (id, version) ->
  root = package_dir id, version
  if fs.existsSync "#{root}/package.cson"
    return CSON.parseFileSync "#{root}/package.cson"
  else if fs.existsSync "#{root}/package.coffee"
    return require("#{root}/package.coffee").package


# middleware
exports = module.exports = (cfg) ->

  # settings
  _cache = new LRU {max: 50, maxAge: 1000*60*5}
  prod = process.env.LT3_ENV == 'prod'
  logger = if prod then 'default' else 'dev'
  useCache = prod
  useCompression = prod

  # local deveopment variables
  firebase = null
  user = null

  # watch for file changes
  if not prod
    pkg_path = path.resolve "#{__dirname}/../../pkg"
    console.log pkg_path
    watcher = chokidar.watch pkg_path, {
      ignored: /(^\.|\.swp$|\.tmp$|~$)/
    }
    watcher.on 'change', (path) ->
      path = path.replace pkg_path, ''
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
 
  # middleware
  (req, res, next) ->

    # request specific helpers
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

    # routes
    res.header "Access-Control-Allow-Origin", "*"

    url = req._parsedUrl.pathname
    query = req.query

    if url == "/local-dev/setToken"
      token = query.token
      firebase = new Firebase 'https://lessthan3.firebaseio.com'
      firebase.auth token, (err, data) ->
        return res.send 400 if err
        user = query.user._id
        res.send 200
      return

    re = /\/pkg\/(.*)\/(.*)\/(package.json|main.js|style.css|api|public)\/?(.*)/
    [url, id, version, type, arg] = url.match(re) or []
    return next() if not url

    switch type
      when 'package.json'
        contentType 'application/json'
        cache {age: '10 minutes'}, (next) =>
          next read_package id, version

      when 'main.js'
        contentType 'text/javascript'
        cache {age: '10 minutes'}, (next) =>
          build = (id, version) ->
            root = package_dir id, version
            pkg = read_package id, version
            js = []
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

          js = new wrap.Assets build(id, version), {
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

      when 'style.css'
        contentType 'text/css'
        cache {age: '10 minutes'}, (next) =>
          # todo: build dependency graph to not have double imports
          # or import in the wrong order
          build = (id, version) ->
            root = package_dir id, version
            pkg = read_package id, version
            pkg.main ?= {css: 'style.styl'}
            css = []
            if pkg.dependencies
              css = css.concat(build(k, v)) for k, v of pkg.dependencies
            if pkg.main.css
              asset = new wrap.Stylus {
                src: "#{root}/#{pkg.main.css}"
              }
              asset.pkg = pkg
              css.push asset
            css

          css = new wrap.Assets build(id, version), {
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

      when 'public'
        res.sendfile "#{package_dir id, version}/#{arg}"

      when 'api'
        svr = require "#{package_id id, version}/api.coffee"
        error 404 if not svr?[arg]
        svr[arg].apply @

