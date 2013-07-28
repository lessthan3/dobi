# LessThan3 Development Kit

## Table of Contents

 - [General Information](#general-information)
  - [General Overview](#general-overview)
  - [Beta](#beta)
  - [Tools](#tools)
  - [Getting Started](#getting-started)
  - [LessThan3 Website Layout](#lessthan3-website-layout)
 - [Packages](#packages)
  - [Types](#types)
  - [Configuration](#configuration)
  - [Routes](#routes)
  - [API](#api)
  - [Examples](#examples)
 - [Development Server](#development-server)
  - [Overview](#overview)
  - [How It Works](#how-it-works)
  - [Example](#example)
 - [LessThan3 Package Manager](#lessthan3-package-manager)
  - [Initialize Your Development Environment](#initialize-your-development-environment)
  - [Manage your development server](#manage-your-development-server)
  - [Manage your packages](#manage-your-packages)
  - [Manage your production server](#manage-your-production-server)
 - [Deployment](#deployment)

## General Information

### General Overview
This kit is made for developers planning to build/maintain sites running on the
LessThan3 Network. All of the sites have a common structure, but allow for 
complete customization.

Benefits of the LessThan3 Platform.

 - Strong caching is built into the core of the infrastructure
 - Any dynamic site data, by default, can be updated real-time. Alternatively,
   apps can define which data to listen for updates on
 - By defining a simple data model for your package, a simple, intuitive
   administration interface is provided to your user
 - Develop in coffee-script and stylus
 - All of this allows you to build/test/deploy/reuse/sell apps extremely
   efficiently to our growing network of clients

### Beta
LessThan3 Package Development/Deployment is currently in beta. Developers
must be registered before the development kit will work on a live site.
Contact bryant@lessthan3.com if you'd like more information on getting started.

### Tools

 - lessthan3 development server

 - TODO: lessthan3 production server

 - TODO: lessthan3 package manager (lpm)
  - assists with create a package server
  - assists with creating new packages
  - assists with package submission to hosted environment
  - assists with package deployment to personal lt3 package server


### Getting Started

 - install node.js
  - http://howtonode.org/how-to-install-nodejs
 - learn coffee-script
  - packages can be written in javascript, but coffee-script is encouraged
  - http://coffeescript.org/
  - http://arcturo.github.io/library/coffeescript/index.html
 - learn stylus/nib
  - http://learnboost.github.io/stylus/
  - http://visionmedia.github.io/nib/
  - CSS, SASS, and LESS will be supported in the future, but stylus/nib is encouraged

### LessThan3 Website Layout
```
  - html
    - head
    - body
      - application
        - header (header package rendered here)
        - content
          - apps
            - app (current app rendered here)
              - pages
                - page (current page rendered here)
        - footer (footer package rendered here)
```

## Packages

### Types

 - app: An app is a dynamic section of code in the app
 - header: A header is static code at the top of the page
 - footer: A footer is static code at the bottom of the page
 - theme: A theme allows for full customization over the style of a site

### Configuration
```
{
  author: 'Your Name'
  category: 'footer'
  changelog:
    'major.minor.patch': ‘initial commit'
  contact: ‘me@domain.com'
  description: 'description of this package'
  id: 'namespace-name'
  name: 'readable name’
  pages:
    type1: {DATA_MODEL_SCHEMA}
    type2: {DATA_MODEL_SCHEMA}
  settings: {DATA_MODEL_SCHEMA}
  tags: [
    ‘tag1’
    ‘tag2’
  ]
  type: 'app'
  version: 'major.minor.patch'
}

Full Verbose Schema Example
  settings:
    str: {type: ‘string’}
    str_enum: {type: ‘string’, enum: [‘foo’, ‘bar’]}
    str_long: {type: ‘string’, editor: ‘textarea’}
    bool: {type: ‘boolean’}
    int: {type: ‘integer’}
    arr: {
      type: ‘array’
      legend: ‘foo’
      items:
        foo: {type: ‘string’}
        bar: {type: ‘string’}
    }
    obj: {
      type: ‘object’
      properties:
        foo: {type: ‘string’}
        bar: {type: ‘string’}
    }

3 Rules to simplify your syntax
 1. if typeof value is a string, then that string is the type of that property.
 2. if typeof value is an object, then that object is assumed to be type == ‘object’
 3. if typeof value is an array, then that object is assumed to be type == ‘array’

Let’s now look at the above example in our simplified syntax
  settings:
    str: ‘string’
    str_enum: {type: ‘string’, enum: [‘foo’, ‘bar’]}
    str_long: {type: ‘string’, editor: ‘textarea’}
    bool: ‘boolean’
    int: ‘integer’
    arr: [
      foo: {type: ‘string’, legend: true}
      bar: ‘string’
    ]
    obj: {
      foo: {type: ‘string’}
      bar: {type: ‘string’}
    }
```

### Routes
```
# get package details
http://localhost:3001/pkg/bryant-cool-app/0.1.1/package.json

# get package javascript
http://localhost:3001/pkg/bryant-cool-app/0.1.1/main.js

# get package stylesheet
http://localhost:3001/pkg/bryant-cool-app/0.1.1/style.css

# get public/static file
http://localhost:3001/pkg/bryant-cool-app/0.1.1/public/test.txt

# make api call
http://localhost:3001/pkg/bryant-cool-app/0.1.1/api/foo
```

### API
```
module.exports =
  foo: ->
    # this will cache /pkg/bryant-cool-app/0.1.1/api/foo
    @cache {age: '10 minutes'}, (next) =>
      next 'bar'

  hello: ->
    @res.send 'world'

  ping: ->
    # this will cache /pkg/bryant-cool-app/0.1.1/api/ping?hello=world
    @cache {age: '10 minutes', qs: true}, (next) =>
      next 'ack'
```

#### Call Context
```
{
  cache: (options, next) ->
    # options.age can be '10 minutes' or 600
    # options.qs can be true|false to include the query params in the cache key
    # passing data to "next" will cache and return the data
  req: req
  res: res
}
```

### Examples

#### App

app.coffee
```
class exports.App extends lt3.App

  load: (next) ->
    next()

  template: ->
    div class: 'pages'
```

package.cson
```
{
  author: 'Bryant Williams'
  changelog:
    '0.1.1': 'test app'
  contact: 'bryant@lessthan3.com'
  description: 'My First App'
  id: 'bryant-cool-app'
  pages:
    index:
      title: 'string'
    monkey:
      kind: 'string'
      name: 'string'
      description: 'string'
      image: 'string'
  name: 'My First App'
  type: 'app'
  version: '0.1.1'
}
```

style.styl
```
.exports
  .some-div
    padding 36px 50px
```

pages/monkey.coffee
```
class exports.Page extends lt3.Page

  # events
  #
  # You can specify event handlers here
  # 'event-type selector': 'event-handler'
  events:
    'click .title': 'onTitleClick'

  onTitleClick: (e) ->
    el = $(e.currentTarget)
    console.log el.text()

  # to specify events outside of this page
  # ex: window resize or scroll
  delegateEvents: ->
    super()
    $(window).bind 'resize', @onWindowResize

  undelegateEvents: ->
    super()
    $(window).unbind 'resize', @onWindowResize

  # load
  #
  # load may be called prior to rendering if more data is needed.
  # by default, you will be provided with the data as specified in
  # package.cson, but sometimes you need to query an external api for
  # extra data before rendering the page
  #
  # store any extra data in the @_ variable. This variable becomes the
  # context the template function is applied to
  load: (next) ->
    @$el.html 'loading...'
    $.ajax {
      url: 'http://domain.com/api/get/ice-cream'
      success: (data) =>
        @_.extra = data
        next()
    }


  # render
  #
  # the parent method (super) will render the current data
  # into your template. by override render, we can run javascript
  # after the template has been rendered
  render: ->
    super()
    @$el.find('content').css {
      color: '#000'
    }

  # template
  #
  # here you can define the html template for this page
  # Page data can be accessed through @
  template: ->
    h2 class: 'title', ->
      @title

    div class: 'image', ->
      img src: @image

    div class: 'content', ->
      @content
```

#### Header

header.coffee
```
```

package.cson
```
```

style.styl
```
```

#### Footer
footer.coffee
```
```

package.cson
```
```

style.styl
```
```

#### Theme
package.cson
```
```

style.styl
```
```


## Development Server

### Overview
Development on the LessThan3 Platform is ran on live sites. By running a local
server, your browser client can redirect loading code from your local server
instead of production.  This allows you to run your code in an isolated sandbox
or on production data.

Updating data is pushed live automatically for headers, footers, and pages.
Apps can also choose to define their own real-time data update logic instead
of the default though.

When running the development server, you get the benefit on hot code-pushes as
well to speed up your efficiency while updating templates and stylesheets.

Because the LessThan3 package routes are just express middleware, you have the
ability to add any other custom functionality to your server that you want.

### How It Works
When you login to a site on the LessThan3 platform, it will check whether you
are a developer or not.  If you are a developer, it checks if you have a local
development server running.  If you do, it will connect your browser client to
your development server, load code locally instead of from production, and
refresh your applications as code is updated.

### Example Server
```
# dependencies
express = require 'express'
lessthan3 = require '../../lib/server' # require 'lessthan3'
pkg = require './package'

# configuration
app = express()
app.use express.logger()
app.use express.bodyParser()
app.use express.methodOverride()
app.use express.cookieParser()
app.use lessthan3 {
  pkg_dir: "#{__dirname}/pkg"
}
app.use app.router
app.use express.errorHandler {dumpExceptions: true, showStack: true}

# listen
app.listen pkg.config.port
console.log "listening: #{pkg.config.port}"
```

## LessThan3 Package Manager

### Initialize Your Development Environment
 - lpm init

### Manage your development server
 - lpm dev start
 - lpm dev stop

### Manage your packages
 - lpm pkg create my-package 0.1.0
 - lpm pkg deploy remote my-package 0.1.0
 - lpm pkg submit my-package 0.1.0

### Manage your production server
 - lpm prod init
 - lpm prod start
 - lpm prod stop

 - create a new devepackage server
 - create a new package
 - deploy a package

## Deployment
There are a couple ways to get your packages out in the wild. Packages
can be hosted on the LessThan3 servers, can be hosted on your personal
server, or can be hosted on a CDN.

Packages hosted on the LessThan3 servers must be submitted for approval
before being accepted. Personally hosted packages can be deployed at anytime
without review.

### Deployment to LessThan3
Packages hosted on LessThan3 can be submitted with
```lpm pkg submit my-package 0.1.0```

You can check the status of your application with
```lpm pkg status my-package 0.1.0```

Or check the status of all of your submitted packages with
```lpm pkg status```

Packages submitted and approved, can be made available to anyone on the network.

### Deployment to a Personal Server
Packages can be deployed to your own node server.

First, set up your production lt3 server.
```lpm prod init```

Then run it.
```lpm prod start```

Make sure it's running
```lpm prod status```

Define your remote (where the server lives) in your server config.cson.
Your deployment can be done with ssh, ftp, or git
```
{
  remote:
    prod:
      method: 'ssh'
      host: 'mydomain.com'
      port: '22'
      path: '/u/apps/my-lt3-package-server'
    prod2:
      method: 'ftp'
      host: 'ftp.mydomain.com'
      port: '21'
      path: '/u/apps/my-lt3-package-server'
    prod3:
      method: 'git'
      url: 'ssh://deploy@my-server/u/apps-my-lt3-package-server'
}
```

Deploy your package
```lpm pkg deploy prod my-package 0.1.0```

### Deployment to a CDN
A CDN can only host files, so by deploying to a CDN, your app
will not be able to take advantage of custom API calls. This is fine
for 90% of packages.

Define your remote
```
{
  remote:
    rackspace:
      method: 'rackspace-cloudfiles'
      username: ''
      key: ''
    amazon:
      method: 'amazon-s3'
      key: ''
      secret: ''
    custom:
      build: true
      method: 'ftp'
      host: 'ftp.mydomain.com'
      port: '21'
      path: '/u/apps/my-lt3-package-server'
}
```

Note that you can also host your (non-api) packages on a server without node
and deploy with ftp by providing the build parameter.  Build will compile
the config, javascript, and stylesheet assets for your package and upload those
directly, along with any public files.





