class exports.Presenter
  template_engine: 'teacup'

  events:
    'click .mobile-nav-toggle': 'onToggleMobileNav'

  listeners:
    '': 'refresh'

  onToggleMobileNav: ->
    $('#application').toggleClass 'open-mobile-nav'

