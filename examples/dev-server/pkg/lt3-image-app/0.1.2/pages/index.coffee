class exports.Page extends lt3.Page

  events: ->
    'hover .social-buttons': 'loadSocial'

  loadSocial: (e) ->
    Socialite.load e.currentTarget

  template: ->
    if @social
      url = document.location.href
      ul class:'social-buttons', ->
        li ->
          a {
            class: 'socialite twitter-share'
            href: 'http://twitter.com/share'
            'data-url': url
            'data-text': @twitter_text
            rel: 'nofollow'
            target: '_blank'
          }
        li ->
          a {
            class: 'socialite facebook-like'
            href: "http://facebook.com/sharer.php?u=#{url}&amp;t=Socialite.js"
            'data-href': url
            'data-send': 'false'
            'data-layout': 'button_count'
            'data-show-faces': 'false'
            rel: 'nofollow'
            target: '_blank'
          }
    if @url
      a href: @url, target: '_blank', ->
        img src: @image
    else
      img src: @image

