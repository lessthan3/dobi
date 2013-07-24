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
app.use lessthan3 {}
app.use app.router
app.use express.errorHandler {dumpExceptions: true, showStack: true}

# listen
app.listen pkg.config.port
