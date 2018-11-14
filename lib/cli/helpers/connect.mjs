import mongodb from 'mongodb';
import login from '../commands/login';
import { log } from '../../utils';
import { dobiConfig } from '../config';

const { mongo: mongoConfig } = dobiConfig;

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
    const {
      db: database,
      host,
      options,
      pass,
      port,
      user,
    } = MONGO_CONFIG;

    const url = `mongodb://${user}:${pass}@${host}:${port}/${database}`.replace(':@', '@');
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
