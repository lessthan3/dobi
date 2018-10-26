export default fn => (req, res, next) => {
  fn(req, res, next).catch((err) => {
    if (!err.statusCode) {
      // eslint-disable-next-line no-console
      console.error(err.stack || err);
      return res.sendStatus(500);
    }
    return res.status(err.statusCode).send(err.message);
  });
};
