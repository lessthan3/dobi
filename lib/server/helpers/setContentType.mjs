/**
 * @param {Object} res
 * @param {string} type
 * @return {void}
 */
export default (res, type) => (
  res.set('Content-Type', type)
);
