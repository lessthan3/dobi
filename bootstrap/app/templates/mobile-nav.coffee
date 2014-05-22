exports.Template = ->
  div class: 'sidebar', ->
    a class: 'logo', href: '/', ->
      img 'data-ref': 'logo'

    if @navigation
      nav class: 'navigation', ->
        ul ->
          for nav in @navigation
            li ->
              switch nav.type
                when 'link'
                  a href: nav.url, ->
                    nav.text

  div class: 'overlay'
