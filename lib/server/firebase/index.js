'use strict';

const firebase = require('firebase');

let fbCache;
const connect = ({
  apiKey,
  databaseURL,
}) => {
  if (fbCache) {
    return fbCache;
  }

  fbCache = firebase.initializeApp({
    apiKey,
    databaseURL,
  }, 'dobi-app');

  return fbCache;
};

module.exports = {
  connect,
};
