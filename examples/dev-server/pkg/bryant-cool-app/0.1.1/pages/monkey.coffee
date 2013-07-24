class exports.Page extends lt3.Page

  # events
  #
  # You can specify event handlers here
  # 'event-type selector': 'event-handler'
  events:
    'click .title': 'onTitleClick'
  
  onTitleClick: (e) ->
    el = $(e.currentTarget)
    console.log el.text()

  # to specify events outside of this page
  # ex: window resize or scroll
  delegateEvents: ->
    super()
    $(window).bind 'resize', @onWindowResize

  undelegateEvents: ->
    super()
    $(window).unbind 'resize', @onWindowResize

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


  # render
  #
  # the parent method (super) will render the current data
  # into your template. by override render, we can run javascript
  # after the template has been rendered
  render: ->
    super()
    @$el.find('content').css {
      color: '#000'
    }

  # template
  #
  # here you can define the html template for this page
  # Page data can be accessed through @
  template: ->
    h2 class: 'title', ->
      @title

    div class: 'image', ->
      img src: @image

    div class: 'content', ->
      @content
