class exports.Region

  events:
    'click .mobile-nav-toggle': 'onToggleMobileNav'

  listeners:
    '': 'refresh'

  onToggleMobileNav: ->
    $('#application').toggleClass 'open-mobile-nav'

