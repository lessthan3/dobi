request = require 'request'

module.exports =
  tracks: ->
    @cache {age: '10 minutes'}, (next) =>
      respond = (tracks) ->
        next ({
          id: t.id
          slug: t.slug
          url: "http://beatport.com/track/#{t.slug}/#{t.id}"
          artists: ({
            id: a.id
            slug: a.slug
            url: "http://beatport.com/artist/#{a.slug}/#{a.id}"
            name: a.name
          } for a in t.artists when a.type isnt 'remixer')
          sampleUrl: t.sampleUrl
          lengthMs: t.lengthMs
          images:
            large: {url: t.images.large.url}
            waveform: {url: t.images.waveform.url}
          releaseDate: t.releaseDate
          title: t.title
          label:
            id: t.label.id
            slug: t.label.slug
            url: "http://beatport.com/label/#{t.label.slug}/#{t.label.id}"
            name: t.label.name
        } for t in tracks)

      api = 'http://api.beatport.com/catalog/3'
      id = @query.artist_id
      @query.type ?= 'recent'
      switch @query.type
        when 'recent'
          q = "facets[]=performerId:#{id}&perPage=10&sortBy=publishDate%20desc"
          url = "#{api}/tracks?#{q}"
          request url, (err, response, body) =>
            return @error 500 if err
            respond JSON.parse(body).results
        when 'popular'
          q = "id=#{id}"
          request "#{api}/beatport/artist?#{q}", (err, response, body) =>
            return @error 500 if err
            respond JSON.parse(body).results.topDownloads

