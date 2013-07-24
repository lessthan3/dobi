class exports.App extends lt3.App

  # load
  #
  # load may be called prior to rendering if more data is needed.
  # by default, you will be provided with the data as specified in
  # package.cson, but sometimes you need to query an external api for
  # extra data before rendering the page
  #
  # store any extra data in the @_ variable. This variable becomes the
  # context the template function is applied to
  load: (next) ->
    @$el.html 'loading...'
    $.ajax {
      url: 'http://domain.com/api/get/ice-cream'
      success: (data) =>
        @_.extra = data
        next()
    }

  # template
  #
  # Here you can override an apps default template of just the pages div.
  # With this, you can define parts of an app that remain static while you
  # navigate pages within an app
  #
  # The context of the template is the data from "settings" as defined
  # in the package.cson
  template: ->
    div class: 'app-header', ->
      @title
    div class: 'app-content', ->
      div class: 'pages'
      div class: 'app-sidebar'
