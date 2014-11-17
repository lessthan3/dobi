exports.Template = (data) ->
  {social, copyright} = data
  div '.content', ->
    ul '.social', ->
      social ?= []
      for item in social
        li ->
          a href: "http://www.#{item.service}.com/#{item.username}", ->
            i ".icon-#{item.service}"

    div '.info', ->
      if copyright
        div '.copyright', -> "© #{copyright}"

      div '.network', ->
        text 'Built with '
        a href: 'http://www.dobi.io', -> 'Dobi.io'

      div '.privacy', ->
        a 'data-app': 'pages', 'data-page': 'privacy', ->
          'Privacy Policy'

      div '.terms', ->
        a 'data-app': 'pages', 'data-page': 'terms', ->
          'Terms of Use'
