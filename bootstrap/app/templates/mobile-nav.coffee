exports.Template = (data) ->
  {navigation} = data
  div '.sidebar', ->
    a '.logo', href: '/', ->
      img 'data-ref': 'logo'

    if navigation
      nav '.navigation', ->
        ul ->
          for nav in navigation
            li ->
              switch nav.type
                when 'link'
                  a href: nav.url, ->
                    nav.text

  div '.overlay'
