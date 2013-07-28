# LessThan3 Development Kit

## Tools

 - lessthan3 development server

 - TODO: lessthan3 production server

 - TODO: lessthan3 package manager (lpm)
  - assists with create a package server
  - assists with creating new packages
  - assists with package submission to hosted environment
  - assists with package deployment to personal lt3 package server


## Getting Started

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

## Page Layout
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

## Package Types

 - app: An app is a dynamic section of code in the app
 - header: A header is static code at the top of the page
 - footer: A footer is static code at the bottom of the page
 - theme: A theme allows for full customization over the style of a site

### Example App

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

### Example Header
### Example Footer
### Example Theme

## package.cson (your package config)
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

# LessThan3 Development Server
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

### Package Routes
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

## Example Package API
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

### Package API Call Context
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

