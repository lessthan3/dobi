'use strict';

module.exports = async (req, res, next) => {
  const token = req.query.token || req.body.token;
  if (token) {
    try {
      const { admin, user } = await req.fbAdmin.auth().verifyIdToken(token);
      req.user = user;
      req.admin = admin;
    } catch (authErr) {
      req.tokenParseError = authErr;
    }
  }
  if (next) {
    return next();
  }
  return null;
};
