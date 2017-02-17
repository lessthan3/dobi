$.hello = ->
  console.log 'hello world'

$.fn.hello = (options) ->
  $(this).html 'hello world'

