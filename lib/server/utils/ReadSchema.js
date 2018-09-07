const readConfig = require('./ReadConfig');


const readSchema = (id, version, next) => {
  const root = path.join(getPackage(id, version));
  let schema = {};
  return readConfig(id, version, (err, config) => {
    if (err) { return next(err); }

    // TODO (remove): backwards compatibility
    if (config.pages && !config.core) { schema = config.pages; }
    if (config.settings) { schema = config.settings; }

    return readSchemaDirectory(root, 'models', schema, err => readSchemaDirectory(root, 'schema', schema, (err) => {
      if (err) { return next(err); }
      return next(null, schema);
    }));
  });
};
