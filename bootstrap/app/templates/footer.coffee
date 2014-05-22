exports.Template = ->
  div class: 'content', ->
    ul class: 'social', ->
      @social ?= []
      for item in @social
        li ->
          a href: "http://www.#{item.service}.com/#{item.username}", ->
            i class: "icon-#{item.service}"

    div class: 'info', ->
      if @copyright
        div class: 'copyright', ->
          text "© "
          @copyright

      div class: 'network', ->
        text 'Built with '
        a href: 'http://www.dobi.io', -> 'Dobi.io'

      div class: 'privacy', ->
        a 'data-app': 'pages', 'data-page': 'privacy', ->
          'Privacy Policy'

      div class: 'terms', ->
        a 'data-app': 'pages', 'data-page': 'terms', ->
          'Terms of Use'
