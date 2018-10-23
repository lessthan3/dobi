'use strict';

const admin = require('firebase-admin');

let fbCache;
const connect = ({
  credential,
  databaseURL,
}) => {
  if (fbCache) {
    return fbCache;
  }

  fbCache = admin.initializeApp({
    credential: admin.credential.cert(credential),
    databaseURL,
  }, 'dobi-app');

  return fbCache;
};

module.exports = {
  connect,
};
