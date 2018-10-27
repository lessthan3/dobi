import path from 'path';
import { asyncWriteFile } from '../../../utils';

export default async ({
  data, distDir, id, version,
}) => {
  // check if the package directory exists
  const packagePath = path.join(distDir, id, version);
  const jsFilePath = path.join(packagePath, 'main.js');
  await asyncWriteFile(jsFilePath, data);
};
