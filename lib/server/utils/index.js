


module.exports = config => {
  const {
    PKG_DIR
  } = config;
  const getPackage =  => (id, version) => path.join(PKG_DIR, id, version);
};
