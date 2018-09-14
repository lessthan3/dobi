'use strict';

/**
 * @param {Object} _res
 * @param {number} _code
 * @param {string} [_msg]
 * @return {*}
 */
module.exports = function error(_res, _code, _msg) {
  // hack to allow error calling from the apis to work
  let [res, code, msg] = [_res, _code, _msg];
  if (typeof _res === 'number') {
    [res, code, msg] = [this.res, res, code];
  }
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
  if (typeof msg === 'object' && msg.stack) {
    // eslint-disable-next-line no-console
    console.error(msg.stack);
  }
  if (!msg) {
    return res.sendStatus(code);
  }
  return res.status(code).send(msg);
};
