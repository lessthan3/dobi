
# dependencies
coffeelint = require 'coffeelint'
colors = require 'colors'
cson = require 'season'
fs = require 'fs'
jsonlint = require 'jsonlint'
path = require 'path'
stylus_help = require 'stylus-help'

# state
EXIT_CODE = 0
ERRORS = []
EXTENSIONS = ['coffee', 'cson', 'styl']

# helpers
period = String.fromCharCode 46

log = ->
  c = console ; c.log arguments...

fail = (line_number, message, line) ->
  ERRORS.push {line_number, message, line}

module.exports = (filename, next) ->

  ERRORS = []

  read = (filename) ->
    return next 0 unless fs.existsSync filename
    fs.readFileSync filename, 'utf8'

  # file info
  ext = path.extname(filename)[1..]
  contents = read filename
  lines = contents.split '\n'

  # only check certain extensions
  return next() unless ext in EXTENSIONS

  # trailing whitespace is not allowed
  msg = 'Trailing whitespace is not allowed'
  for line, index in lines
    if /\s$/.test line
      fail index + 1, msg, line

  # trailing commas not allowed is not allowed
  if ext isnt 'cson'
    msg = 'Trailing commas are not allowed'
    for line, index in lines
      if /,$/.test line
        fail index + 1, msg, line

  # must be no spaces before a comma
  msg = 'No spaces allowed before a comma'
  for line, index in lines
    if /\s,/.test line
      continue if 0 < line.indexOf 'Regex' # in a regex
      continue if 0 < line.indexOf ' /' # in a regex
      continue if 0 < line.indexOf '(/' # in a regex
      continue if /".*,.*"/.test line # in a string
      continue if /'.*,.*'/.test line # in a string
      fail index + 1, msg, line

  # require a space after a comma
  # stylus catches it's own way
  if ext in ['coffee', 'cson']
    msg = 'Must include a space after a comma'
    for line, index in lines
      if /,[^\s']/.test line
        continue if 0 < line.indexOf 'Regex'
        continue if 0 < line.indexOf ' /' # in a regex
        continue if 0 < line.indexOf '(/' # in a regex
        continue if /{[0-9,]*}/.test line # in a regex
        continue if /".*,.*"/.test line # in a string
        continue if /'.*,.*'/.test line # in a string
        fail index + 1, msg, line

  # not allowed to have multiple empty lines
  msg = 'Too many empty lines in a row. Only 1 allowed'
  for line, index in lines
    re = /^$/
    next_line = lines[index + 1]
    if re.test(line) and re.test(next_line)
      fail index, msg, lines[index]

  # require empty line before 'when' in switch statements
  # except when doing a short when... then... statement
  if ext is 'coffee'
    msg = 'An empty line is required before a \'when\' statement'
    for line, index in lines
      if /^(\s)*when[\s\(]/.test line
        continue if line.indexOf('then') > 0
        prev = lines[index - 1]
        if prev isnt '' and not /^(\s)*#/.test prev
          fail index + 1, msg, line

  # console log statements are not allowed
  msg = "console#{period}log statements are not allowed"
  for line, index in lines
    if /console\.log/.test line
      fail index + 1, msg, line

  # tabs are not allowed
  msg = 'Tabs are not allowed. Please use spaces'
  for line, index in lines
    if /\t/.test line
      fail index + 1, msg, line

  # watch out for merge conflicts
  msg = 'Please fix your merge conflicts.'
  for line, index in lines
    if /^(<<<<|====|>>>>)+.*$/.test line
      fail index + 1, msg, line

  # make sure json files are parsable
  if ext is 'json'
    try
      result = jsonlint.parse contents
    catch err
      line_number = /error\son\sline\s(\d)+/.exec(err)?[1]
      fail line_number, err.toString()

  # make sure cson files are parsable
  if ext is 'cson'
    try
      cson.readFileSync filename
    catch err
      if err.constructor is SyntaxError
        fail err.location.first_line, err.toString()
      else
        fail 'unknown', err

  # coffee single line comments
  # - require a space after the #
  # - require an empty line on the previous line
  if ext is 'coffee'

    msg = 'a single space is required after the # of a comment'
    for line, index in lines
      if /^(\s)*#[^\s=#{]/.test line
        fail index + 1, msg, line

    msg = 'an empty line is required prior to a single line comment'
    for line, index in lines
      if /^(\s)*#\s/.test line
        prev = lines[index - 1]
        if prev isnt '' and not /^(\s)*#/.test prev
          fail index + 1, msg, line


    ###
      # string starts
      # whitespace 0 or more
      # not : or # or ( or ) or whitespace 1 or more [CAPTURED]
      # grab (
      # grab all non ) characters (atleast 1)
      # find a )
      # string ends
    ###
    ### sample catches
      $wrap = @$el.find('> .background.temp')
      $el = if e then $(e.currentTarget) else @$el.find('.footer span').eq(0)
      $others = @$el.find('.filter').not($filter)
    ###

    ### ignores because of repeated .data function
      $(a).data('index') - $(b).data('index')
    ###
    msg = 'excess parenthesis or spacing detected'
    for line, index in lines
      match = line.match(/\s*([^:#()\s]+)\([^)]+\)$/)?[1]

      # if the function used more than once in the same
      # line then allow it
      if match and line.indexOf(match) is line.lastIndexOf(match)
        fail index + 1, msg, line

  # lint all edited coffee files
  if ext is 'coffee'
    config = JSON.parse read "#{__dirname}/lint.json"
    errors = coffeelint.lint contents, config
    for err in errors
      continue if err.level isnt 'error'
      fail err.lineNumber, err.message, err.line

  # TODO: lint stylus files
  if ext is 'styl'

    # Config data for custom linting
    # Just flag Jason if it is giving you trouble
    errors = stylus_help.processData 'simple_lint', [filename]
    for file, data of errors
      for infraction, index in data
        fail infraction.line_num, infraction.message, infraction.line

  # output
  if ERRORS.length
    EXIT_CODE = 1
    log '[dobi-lint]', filename.green

    ERRORS = ERRORS.sort (a, b) -> a.line_number - b.line_number
    for {line, line_number, message} in ERRORS
      log '[dobi-lint]', "##{line_number}".red + ':', message
      if line
        indent = ''
        indent += ' ' for i in [0..."#{line_number}".length + 3]
        line = "#{line.replace /\s*(.*)/, "#{indent}$1"}"
        log '[dobi-lint]', line.cyan
      log ''
  next EXIT_CODE
