// sets dobi config on state
export default config => async (ctx, next) => {
  const {
    debug = false,
    // eslint-disable-next-line no-console
    logFn = msg => console.log(msg),
  } = config;

  ctx.state = {
    ...ctx.state,
    dobiConfig: config,
    log: msg => debug && logFn(msg),
  };
  await next();
};
