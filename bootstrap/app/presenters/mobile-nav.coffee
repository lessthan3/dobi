class exports.Region

  close: ->
    $('#application').removeClass 'open-mobile-nav'

  events:
    'click a': 'close'
    'click .overlay': 'close'

  listeners:
    '': 'refresh'

