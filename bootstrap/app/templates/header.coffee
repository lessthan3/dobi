exports.Template = ->
  div class: 'mobile', ->
    div class: 'mobile-nav-toggle', ->
      i class: 'icon-menu'

  div class: 'web', ->
    a class: 'logo', href: '/', ->
      img 'data-ref': 'logo'

