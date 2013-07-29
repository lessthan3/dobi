class exports.Page extends lt3.Page
  events:
    'click .play': 'play'
    'click .pause': 'pause'
    'click .waveform': 'seek'
    'hover .footer': 'loadSocial'
  load: (next) ->
    $(@el).text 'loading tracks...'
    @loadSoundManager()
    $.ajax {
      url: "/pkg/lt3-beatport-app/0.1.6/api/tracks"
      data: @_
      type: 'GET'
      dataType: 'json'
      success: (data, textStatus, jqHXR) =>
        @_.tracks = data
        next()
      error: (jqXHR, textStatus, error) =>
        app.log error
    }
  loadSound: (id, pos=0) ->
    el = @$el.find ".track[data-id=#{id}]"
    sound_id = "track-#{el.data 'id'}"
    soundManager.createSound {
      id: sound_id
      url: el.data 'sample'
      autoPlay: true
      onload: ->
        soundManager.setPosition sound_id, pos
      whileplaying: ->
        duration = el.data 'duration'
        start = el.data 'start'
        position = start + this.position

        msToTime = (ms) =>
          s = Math.floor (ms / 1000) % 60
          m = Math.floor (ms / (60 * 1000)) % 60
          s = "0#{s}" if s < 10
          m = "0#{m}" if m < 10
          "#{m}:#{s}"

        el.find('.time').text "#{msToTime position}/#{msToTime duration}"

        percent = "#{(position/duration)*100}%"
        el.find('.progress').css 'width', percent
      onplay: ->
        el.find('.play').toggleClass 'play pause'
      onpause: ->
        el.find('.pause').toggleClass 'play pause'
      onresume: ->
        el.find('.play').toggleClass 'play pause'
      onfinish: ->
        el.find('.pause').toggleClass 'play pause'
        next = @$el.find('.track').eq(el.index()+1)
        soundManager.play "track-#{next.data 'id'}"
        next.find('.play').toggleClass 'play pause'
    }

  loadSoundManager: ->
    soundManager.setup
      url: '/libs/soundmanager/2.97a/soundmanager2.swf'
      flashVersion: 8
      ontimeout: (e) ->
        console.log 'an error occurred'

  pause: (e) ->
    id = $(e.currentTarget).data 'id'
    sound_id = "track-#{id}"
    soundManager.pause sound_id

  play: (e) ->
    id = $(e.currentTarget).data 'id'
    sound_id = "track-#{id}"
    soundManager.pauseAll()
    if soundManager.getSoundById sound_id
      soundManager.play sound_id
    else
      @loadSound id

  loadSocial: (e) ->
    Socialite.load e.currentTarget

  seek: (e) ->
    track = $(e.currentTarget).parent().parent().parent()
    id = track.data 'id'
    sound_id = "track-#{id}"
    duration = track.data 'duration'
    start = track.data 'start'
    pos = Math.floor(e.offsetX/680 * duration) - start
    soundManager.pauseAll()
    if soundManager.getSoundById sound_id
      soundManager.play sound_id
      soundManager.setPosition sound_id, pos
    else
      @loadSound id, pos

  template: ->
    div class: 'beatport', ->
      div class: 'tracks', ->
        for track in @tracks
          div {
            class: 'track box border-bottom'
            'data-sample': track.sampleUrl
            'data-id': track.id
            'data-duration': track.lengthMs
            'data-start': track.lengthMs / 2.5
          }, ->
            div class: 'cover', ->
              a href: track.url, target: '_blank', ->
                img src: track.images.large.url
            div class: 'inner', ->
              div class: 'top border-bottom', ->
                div class: 'play', 'data-id': track.id
                div class: 'info', ->
                  div class: 'artists', ->
                    for ar, i in track.artists
                      a class: 'artist', href: ar.url, target: '_blank', ->
                        ar.name
                      text ', ' if i < track.artists.length-1
                  div class: 'title', ->
                    a href: track.url, target: '_blank', ->
                      track.title
                    text ' '
                    a href: track.label.url, target: '_blank', ->
                      "[#{track.label.name}]"
                a href: track.url, class: 'buy', target: '_blank'
              div class: 'player', ->
                div class: 'progress', ->
                  div class: 'time'
                img src: track.images.waveform.url, class: 'waveform'
              div class: 'footer', ->
                span class: 'release', -> "Released #{track.releaseDate}"
                ul class:'social-buttons', ->
                  li ->
                    a {
                      class: 'socialite twitter-share'
                      href: 'http://twitter.com/share'
                      'data-url': track.url
                      'data-text': "#{track.title} by #{(ar.name for ar in track.artists).join ', '}"
                      rel: 'nofollow'
                      target: '_blank'
                    }
                  li ->
                    a {
                      class: 'socialite facebook-like'
                      href: "http://facebook.com/sharer.php?u=#{track.url}&amp;t=Socialite.js"
                      'data-href': track.url
                      'data-send': 'false'
                      'data-layout': 'button_count'
                      'data-show-faces': 'false'
                      rel: 'nofollow'
                      target: '_blank'
                    }
      div class: 'clearfix'
