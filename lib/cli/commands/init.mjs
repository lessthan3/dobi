import fs from 'fs-extra';
import path from 'path';
import { CWD } from '../config';
import { asyncMkdirp, log } from '../../utils';
import { getWorkspacePath } from '../helpers';

export default async () => {
  let workspace;
  try {
    workspace = await getWorkspacePath();
  } catch (err) {
    if (err.message !== 'must be in a workspace to create a package') {
      throw err;
    }
  }

  if (workspace) {
    throw new Error(`already in a workspace: ${workspace}`);
  }

  const workspacePath = path.join(CWD, 'dobi.json');
  const pkgPath = path.join(CWD, 'pkg');
  await fs.writeFile(workspacePath, JSON.stringify({ created: Date.now() }));
  await asyncMkdirp(pkgPath);
  log(`workspace successfully created at: ${CWD}`);
};
