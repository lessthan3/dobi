console.log 'NOT A RUNNABLE FILE'
exit()
###
THIS IS A COLLECTION OF SCRIPTS RUN TO DO MIGRATIONS... THIS FILE IS NOT RUNNABLE BUT MORE LIKE A RECORD FOR EASY LOOKUP.
ADD THESE MANUALLY TO lt3.coffee  THese can be VERY dangerous... please use caution and test before use! Some of these will be out of date!
###

  # script to conver basic info to type info
  when 'basic-info-to-basic'
    getDB (db) ->
     db.get('objects').findOne {site_id:"534310814b367d753308aa20",type:'basic-info',_id:'53522548598e7c450508ae4f'}, (err, object) =>

        temp=object.val()
        temp.type='info'
        for cont in temp.data.content
          cont.title=cont.header
          delete cont.header

        delete temp.data.layout
        object.set(temp)
        console.log(JSON.stringify(temp,null,3))
      rl.prompt();

  # script to change all the stages on a artist
  when 'stageChange'
    getDB (db) ->
     db.get('objects').findOne {site_id:"534310814b367d753308aa20",_id:'5345025f799cf59516865f3f'}, (err, object) =>
        temp=object.val()
        for cont in temp.data.lineup
          if cont.stage == 'Cicuit Grounds'
            cont.stage='Circuit Grounds'
        console.log(JSON.stringify(temp,null,3))
      rl.prompt();