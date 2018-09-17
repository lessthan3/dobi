'use strict';

const path = require('path');
const { CWD } = require('../config');
const { asyncExists } = require('../utils');

const getWorkspacePath = async (current = CWD) => {
  const dobiPath = path.join(current, 'dobi.json');
  const exists = await asyncExists(dobiPath);
  if (exists) {
    return current;
  }

  const parent = path.join(current, '..');
  if (parent === current) {
    throw new Error('must be in a workspace run this command');
  }
  return getWorkspacePath(parent);
};

module.exports = getWorkspacePath;
