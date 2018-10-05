'use strict';

// TODO: remove legacy support.
module.exports = async (req, res, next) => {
  const {
    body,
    decodeLegacySecret,
    fbAdminShards,
    primaryFirebaseShard,
    query,
  } = req;
  const idToken = query.idToken || body.idToken;
  const token = query.token || body.token;
  const shard = query.shard || body.shard || primaryFirebaseShard;

  try {
    if (token) {
      const payload = decodeLegacySecret({
        shard,
        token,
      });
      req.user = payload.d;
      req.admin = payload.admin;
    } else if (idToken) {
      const { user } = await fbAdminShards[shard].auth().verifyIdToken(idToken);
      req.user = user;
    }
  } catch (authErr) {
    req.tokenParseError = authErr;
  }
  if (next) {
    return next();
  }
  return null;
};
