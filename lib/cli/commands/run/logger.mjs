import 'colors/safe.js';

export default async (ctx, next) => {
  const start = Date.now();
  try {
    await next();
  } finally {
    const end = Date.now();
    const durationMs = end - start;
    const writeLog = (failed) => {
      const { url } = ctx.request;
      let { method } = ctx.request;
      let { status } = ctx;
      let prefix;
      let duration;
      if (durationMs >= 5000) {
        duration = `${durationMs}ms`.red;
      } else if (durationMs >= 1000) {
        duration = `${durationMs}ms`.yellow;
      } else {
        duration = `${durationMs}ms`.green;
      }
      if (failed || status >= 500) {
        prefix = 'error:'.red;
        status = `${status}`.red;
        method = `${method}`.red;
      } else if (status >= 400) {
        prefix = 'warn'.yellow;
        status = `${status}`.yellow;
        method = `${method}`.yellow;
      } else {
        prefix = 'info'.cyan;
        status = `${status}`.green;
        method = `${method}`.green;
      }
      const logItem = `${prefix}: ${method} ${status} ${duration} ${url}`;

      console.log(logItem);
    };
    ctx.res.on('close', () => writeLog(true));
    ctx.res.on('finish', () => writeLog(false));
  }
};
