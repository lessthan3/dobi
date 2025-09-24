import path from 'path';
import { CWD } from '../config.mjs';
import { asyncExists } from '../../utils.mjs';

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

export default getWorkspacePath;
