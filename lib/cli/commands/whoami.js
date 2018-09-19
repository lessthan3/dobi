'use strict';

const login = require('./login');
const { log } = require('../../utils');

module.exports = async () => {
  const { user } = await login(false);
  if (!user) {
    throw new Error('not logged in. try "dobi login"');
  }
  log(JSON.stringify(user, null, 2));
};
