import mongodb from 'mongodb';
import login from '../commands/login.mjs';
import { log } from '../../utils.mjs';
import { getDobiConfig } from '../config.mjs';

let db;
let user;
export default async () => {
  if (db && user) {
    return { db, user };
  }
  
  const { token, user: userDoc } = await login();
  if (!(userDoc && token)) {
    throw new Error('please login first: `dobi login`');
  }

  log('connecting to firebase');
  if (!db) {
    // Lazy-load mongo config only when connecting
    const dobiConfig = await getDobiConfig();
    const mongoConfig = dobiConfig.mongo;
    
    const MONGO_CONFIG = {
      db: mongoConfig.db,
      host: mongoConfig.host,
      options: {
        autoReconnect: true,
        keepAlive: 120,
        native_parser: false,
        poolSize: 1,
        useNewUrlParser: true,
      },
      pass: mongoConfig.pass,
      port: mongoConfig.port,
      user: mongoConfig.user,
    };
    
    const {
      db: database,
      host,
      options,
      pass,
      port,
      user: u,
    } = MONGO_CONFIG;

    const url = `mongodb://${u}:${pass}@${host}:${port}/${database}`.replace(':@', '@');
    const mongoClient = await mongodb.MongoClient.connect(url, options);
    db = mongoClient.db(database);
  }

  user = {
    ...userDoc,
    admin_uid: userDoc.uid.replace(/\./g, ','),
    token,
  };
  return { db, user };
};
