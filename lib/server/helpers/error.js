'use strict';

/**
 * @param {Object} res
 * @param {number} code
 * @param {string} [_msg]
 * @return {*}
 */
module.exports = (res, code, _msg) => {
  let msg = _msg;
  if (!msg) {
    switch (code) {
      case 400:
        msg = 'Bad Request';
        break;
      case 404:
        msg = 'Page Not Found';
        break;
      case 500:
        msg = 'Internal Server Error';
        break;
      default:
        break;
    }
  }
  // eslint-disable-next-line no-console
  console.error(`=== ERROR: ${code} ===`);
  // eslint-disable-next-line no-console
  console.error([
    '== START ERROR ==',
    `${msg}`,
    '=== END ERROR ===',
  ].join('\n'));
  if (typeof msg === 'object' && msg.stack) {
    console.error(msg.stack);
  }
  return res.status(code).send(msg);
};
