class exports.Page extends lt3.Page
  template: ->
    div class: 'border', ->
      iframe {
        src: "https://www.surveymonkey.com/s.aspx?sm=#{@code}"
        height: @height or $(window).height()
        width: @width or 896
      }
