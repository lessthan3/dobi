module.exports =
  foo: ->
    @cache '10 minutes', (next) =>
      next 'bar'

  hello: ->
    @res.send 'world'
