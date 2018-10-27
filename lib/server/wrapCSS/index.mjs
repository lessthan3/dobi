import wrap from 'dobi-asset-wrap';
import { USE_COMPRESSION } from '../config';

export default async (list, query) => {
  const css = new wrap.Assets(list, {
    compress: USE_COMPRESSION,
    vars: query,
    vars_prefix: '$',
  });

  await css.wrap();
  const asset = await css.merge();
  return asset.data;
};
