class exports.Header extends lt3.Header
  onWindowScroll: (e) =>
    h = $('#header').height() - $('#navigation').height()
    @$el.css 'top', -(Math.min $(window).scrollTop(), h)

  render: ->
    super()
    if @_.hidden
      $('#content').css 'margin-top', 0
      @$el.css 'height', 0
      @$el.find('.theme-divider').remove()
    else
      if @_.navigation.hidden
        $('#content').css 'margin-top', '80px'
    if @_.navigation.hidden
      $('#navigation').css {height: 0, overflow: 'hidden'}

  # change user status
  setUser: (user) ->
    if user
      @$el.find('.login-btn').hide()
      @$el.find('.profile-btn > .text').text " #{user.public.username}"
      @$el.find('.profile-btn').show()
    else
      @$el.find('.login-btn').show()
      @$el.find('.profile-btn > .text').text ""
      @$el.find('.profile-btn').hide()

  template: ->
    media = 'http://media.lessthan3.com/wp-content/uploads'
    div class: 'background'
    div class: 'inner', ->
      login = ->
        div class: 'btn btn-primary login-btn', ->
          i class: 'icon-user'
          span class: 'text', -> ' Login'
        div class: 'btn btn-primary profile-btn', style: 'display:none', ->
          i class: 'icon-user'
          span class: 'text', -> ' Login'
      admin = ->
        div class: 'btn-group admin-btn', ->
          div class: 'btn btn-primary dropdown-toggle', 'data-toggle': 'dropdown', ->
            i class: 'icon-cog'
            span class: 'text', -> ' Admin'
          ul class: 'dropdown-menu pull-right', ->
            li class: 'edit-entity-btn', -> a href: '#', -> 'Account'
            li class: 'edit-app-btn', -> a href: '#', -> 'Current App'
            li class: 'edit-page-btn', -> a href: '#', -> 'Current Page'

      social_urls =
        facebook: 'http://www.facebook.com'
        instagram: 'http://www.instagram.com'
        itunes: 'https://itunes.apple.com'
        soundcloud: 'http://www.soundcloud.com'
        twitter: 'http://www.twitter.com'
        youtube: 'http://www.youtube.com'

      social = (type) ->
        return if not type
        user = lt3.entity.social[type]
        div class: 'social table-cell', ->
          a href: "#{social_urls[type]}/#{user}", target: '_blank', ->
            url = 'http://media.lessthan3.com/wp-content/uploads/2013/06'
            img src: "#{url}/social_#{type}.png"

      logo = ->
        div class: 'logo table-cell', ->
          a 'data-home': 'home', ->
            img src: lt3.entity.design.logo

      login()
      admin()

      # links
      div class: 'links table', ->
        div class: 'inner table-row', ->
          if @links
            social @links[0]
            social @links[1]
            logo()
            social @links[2]
            social @links[3]
      div id: 'navigation', ->
        div class: 'background'
        div class: 'inner', ->
          tab = (t) ->
            li class: "halo #{if t.type is 'menu' then 'dropdown' else ''}", ->
              switch t.type
                when 'app'
                  slug = t.app or t.slug
                  name = t.text or t.name
                  a 'data-app': slug, 'data-page': t.page, -> name
                when 'link'
                  link = t.link or t.url
                  name = t.text or t.name
                  a href: link, target: '_blank', -> name
                when 'menu'
                  name = t.text or t.name
                  a ->
                    text name
                    b class: 'caret'
                  ul class: 'dropdown-menu', ->
                    tab child for child in t.children
          ul ->
            if not @navigation or @navigation.hidden
              @navigation = [{name: 'Home', slug: 'home', type: 'app'}]
            for nav in @navigation
              tab nav
    div class: 'theme-divider'


