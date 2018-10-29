export default async (ctx, next) => {
  ctx.params.ext = 'js.map';
  await next();
};
