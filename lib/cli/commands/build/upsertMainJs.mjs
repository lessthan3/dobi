import fs from 'fs-extra';
import path from 'path';

export default async ({
  data, distDir, id, version,
}) => {
  // check if the package directory exists
  const packagePath = path.join(distDir, id, version);
  const jsFilePath = path.join(packagePath, 'main.js');
  await fs.writeFile(jsFilePath, data);
};
