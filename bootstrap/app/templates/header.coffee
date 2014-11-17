exports.Template = (data) ->
  div '.mobile', ->
    div '.mobile-nav-toggle', ->
      i '.icon-menu'

  div '.web', ->
    a '.logo', href: '/', ->
      img 'data-ref': 'logo'

