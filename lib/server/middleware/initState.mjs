// sets dobi config on state
export default config => async (ctx, next) => {
  ctx.state.dobiConfig = config;
  await next();
};
