class exports.Page extends lt3.Page

  load: (next) ->
    @_ ?= {}
    pages = lt3.db.pages.find {
      'app._id': @options.app.val()._id
      'type': 'monkey'
    }
    @_.pages = (page.val() for page in pages)
    next()

  template: ->
    ul class: 'monkey-list', ->
      for page in @pages
        li ->
          h2 ->
            a 'data-page': page.slug, ->
              page.data.title
          if page.data.image
            img src: page.data.image
          div class: 'entry', ->
            page.data.content
             
