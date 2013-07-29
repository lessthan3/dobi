###
# https://developers.google.com/youtube/iframe_api_reference
# https://developers.google.com/youtube/training/player/chapter-marker/102
# https://developers.google.com/youtube/player_parameters?playerVersion=HTML5
###
class BigYoutube

  hide: ->
    $('#big-youtube').remove()

  constructor: ->
    $(window).bind 'resize', @resize

  isAPIReady: (next) ->
    @loadAPI()
    fn = ->
      return next() if YT?.Player
      setTimeout fn, 250
    fn()

  loadAPI: ->
    if not YT?.Player
      $.getScript 'http://www.youtube.com/player_api'

  resize: ->
    # fill window
    # but also keep youtube logo in bottom right always
    ratio = 16/9
    w = $(window).width()
    h = $(window).height()
    h = w/ratio if h * ratio < w
    w = h*ratio if w / ratio < h
    t = $(window).height() - h
    l = $(window).width() - w
    $('#big-youtube').css {height: h, width: w, top: t, left: l}
    @player?.setSize w, h
    return [w, h]

  show: (id, options={}) ->
    options.autohide ?= 1
    options.autoplay ?= 1
    options.controls ?= 0
    options.fs ?= 1
    options.loop ?= 1
    options.modestbranding ?= 0
    options.quality ?= 'hd1080'
    options.rel ?= 0
    options.showinfo ?= 0
    options.volume ?= 100

    @hide()
    @isAPIReady =>
      div = $('<div></div>')
      div.attr 'id', 'big-youtube'
      div.css {
        position: 'fixed'
        left: '0'
        top: '0'
        'z-index': -1
      }
      $('body').append div
      [w, h] = @resize()
      @player = new YT.Player 'big-youtube', {
        videoId: id
        width: w
        height: h
        playerVars:
          autohide: options.autohide
          autoplay: options.autoplay
          controls: options.controls
          disablekb: 1
          enablejsapi: 1
          fs: options.fs
          loop: options.loop
          modestbranding: options.modestbranding
          rel: options.rel
          showinfo: options.showinfo
          wmode: 'opaque'
          hd: 1
        events:
          onReady: (e) =>
            @player.setVolume options.volume
            @player.setPlaybackQuality options.quality
          onStateChange: (e) ->
          onPlaybackQualityChange: (e) =>
          onPlaybackRateChange: (e) ->
          onError: (e) ->
      }

$.BigYoutube = new BigYoutube()
