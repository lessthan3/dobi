// sets dobi config on state
export default config => async (ctx, next) => {
  const {
    debug = false,
     
    logFn = msg => console.log(msg),
  } = config;

  ctx.state = {
    ...ctx.state,
    dobiConfig: config,
    log: msg => debug && logFn(msg),
  };
  await next();
};
