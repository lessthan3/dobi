import findit from 'findit';

const ignoredItems = ['.git', 'node_modules'];
const allowedExtRegex = ['coffee', 'cson', 'json', 'styl'].map(item => (
  new RegExp(`.${item}$`)
));
const asyncParseDirectory = pkgPath => new Promise((resolve) => {
  const files = [];
  const finder = findit(pkgPath);
  finder.on('directory', (dir, stat, stop) => {
    if (ignoredItems.includes(dir)) {
      stop();
    }
  });
  finder.on('file', (file) => {
    for (const regex of allowedExtRegex) {
      if (regex.test(file)) {
        files.push(file);
      }
    }
  });
  finder.on('end', () => resolve(files));
});

export default async ({ lintPaths }) => {
  const promises = lintPaths.map(async ({ pkgPath, type }) => {
    if (type === 'file') {
      return pkgPath;
    } if (type === 'directory') {
      return asyncParseDirectory(pkgPath);
    }
    return null;
  });
  return (await Promise.all(promises)).reduce((arr, item) => {
    if (item && item.length) {
      return arr.concat(item);
    }
    return arr;
  }, []);
};
