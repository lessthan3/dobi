const async = require('async');

// read all schema files from a direcotory
module.exports = (root, dir, schema, next) => fs.exists(path.join(root, dir), (exists) => {
  if (!exists) { return next(); }

  // read in the models
  return fs.readdir(path.join(root, dir), (err, files) => {
    let file;
    if (err) { return next(err); }
    files = ((() => {
      const result = [];
      for (file of Array.from(files)) {
        result.push(path.join(root, dir, file));
      }
      return result;
    })());
    return async.each(files, ((file, next) => {
      if (path.extname(file) === '.cson') {
        const key = path.basename(file, '.cson');
        return readCSON(file, (err, model) => {
          schema[key] = model;
          if (err) {
            err = ''`
                Error reading ${file}
                ${err.toString()}
                ${JSON.stringify(err.location, null, 2)}
              ```;
          }
          return next(err);
        });
      }
      return next();
    }), (err) => {
      if (err) { return next(err); }
      return next();
    });
  });
});
