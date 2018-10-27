import admin from 'firebase-admin';

let fbCache;
export default ({
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
