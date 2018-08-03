/*
 * NOTE:
 * XMPP exceptions are declared in txhipchat/txhipchat/error.py
 * which adds some extensions to twisted's jabber protocol StanzaError class:
 * http://twistedmatrix.com/trac/browser/tags/releases/twisted-9.0.0/twisted/words/protocols/jabber/error.py
 */
export const ERRORS = Object.freeze({
  HTTP: 'HTTP',
  XMPP: 'XMPP',
  OFFLINE: 'OFFLINE',
  TIMEOUT: 'TIMEOUT', // status: 0
  STORAGE_JSON_SERIALIZATION: 'STORAGE_JSON_SERIALIZATION', // status: 422
  STORAGE_INACCESSIBLE: 'STORAGE_INACCESSIBLE', // status: 423
  STORAGE_DOM_QUOTA_EXCEEDED: 'STORAGE_DOM_QUOTA_EXCEEDED', // status: 507
  STORAGE_NOT_CONFIGURED: 'STORAGE_NOT_CONFIGURED', // status: 503
  EXCEPTION: 'EXCEPTION', // status: 520,
  OUT_OF_SYNC: 'OUT_OF_SYNC', // status: 409
  RATE_LIMITED: 'RATE_LIMITED' // status: 429
});

/**
 * All errors from the DAL should look like this:
 *
 * @class DALError
 *
 * @property {string} name - "DALError"
 * @property {string} stack - stack trace
 * @property {number} status - status code if applicable
 * @property {string} message - the error message, if could be parsed
 * @property {string} type - One of DALError.Types
 * @property {object} body - the original error body
 * - In the case of an ajax request, will be the jqXHR object
 * - In the case of xmpp, will be x2js'd error stanza
 */


/**
 * @constructs
 * @param {object|error} input
 * @param {string} input.message
 * @param {number} [input.status = 520]
 * @param {string} [input.type = "EXCEPTION"]
 * @param {*} [input.body = null]
 */
const DALError = function (input = { message: '', status: 520, type: ERRORS.EXCEPTION, body: null }) {
  var err = new Error(input.message);
  Object.assign(this, err);

  this.status = input.status;
  this.message = input.message;
  this.type = input.type;
  this.body = input.body;
  this.name = input.name ? `DALError<${input.name}>` : `DALError`;
  if (input.message === 'Invalid OAuth session') {
    this.message = 'If this keeps happening, try logging in again.';
    this.name = '';
  }
  this.stack = input.stack || err.stack || null;
  if (this.stack) {
    let stackRegex = new RegExp(`^${input.name}|^Error`);
    this.stack = this.stack.replace(stackRegex, this.name);
  }
};

DALError.prototype = Object.create(Error.prototype);
DALError.Types = ERRORS;

/**
 * Create a DAL Error from a jQuery XHR error object.
 * Typical Coral error json:
 *
 * {
 *   error: {
 *     message: "some error message", // Invalid OAuth session
 *     code: "same as http error code", // 401
 *     type: "some error type" // HTTP or XMPP
 *   }
 * }
 *
 * @static
 * @method fromJqXHR
 * @param {Object} jqXHR - jquery xhr object
 * @returns {DALError}
 */
DALError.fromJqXHR = function (jqXHR) {
  let message = jqXHR.responseText,
    status = jqXHR.status;

  if (_.isString(message) && message !== '') {
    try {
      let json = JSON.parse(message);
      message = _.get(json, 'error.message', message);
      status = _.get(json, 'error.code', status);
    } catch (e) {
      // (nothingtoseehere)
    }
  }

  return new DALError({
    type: ERRORS.HTTP,
    status,
    message,
    body: jqXHR
  });
};

/**
 * Create a DAL Error from an XMPP error stanza, such as:
 *
 * <presence xmlns="" type="error" from="" to="" id="">
 *   <error code="404" type="cancel">
 *     <item-not-found xmlns="" />
 *     <text xmlns="">Some error text</text>
 *   </error>
 * </presence>
 *
 * <iq xmlns='jabber:client' type='error' from='jid' id='6:sendIQ' to='1_7@chat.devvm.hipchat.com/web||proxy|devvm.hipchat.com|5222'>
 *   <query xmlns='http://hipchat.com/protocol/links' limit='50'/>
 *   <error code='500' type='wait'>
 *     <internal-server-error xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/>
 *   </error>
 * </iq>
 *
 * <message xmlns='jabber:client' type='error' from='jid' to='1_7@chat.devvm.hipchat.com/web||proxy|devvm.hipchat.com|5222'>
 *   <body>some test</body>
 *   <error code='403' type='auth'>
 *     <forbidden xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/>
 *     <text xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'>You must be in this room to send a message.</text>
 *   </error>
 * </message>
 *
 * The text node is not always present, so if it doesn't exist,
 * return the first childNode of error's nodeName, which is a
 * generic message-status type
 *
 * @static
 * @method fromXMPP
 * @param xmpp - an error stanza
 * @returns {DALError}
 */
DALError.fromXMPP = function (xmpp) {
  let errNode = xmpp.querySelector('error'),
    status = parseInt(errNode.getAttribute('code'), 10),
    txtNode = errNode.querySelector('text'),
    //TODO: Create generic error messages per status code?
    message = txtNode ? txtNode.textContent : errNode.childNodes[0].nodeName;

  return new DALError({
    type: ERRORS.XMPP,
    status,
    message,
    body: xmpp
  });
};

/**
 * Returns a DALError of a given type with appropriate status codes and
 * messaging. All these status codes arbitrarily picked from:
 * https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
 *
 * @static
 * @method ofType
 * @param {string} type - one of the DALError.Types enums
 * @param {object|error} [thrownException]
 * @returns {DALError}
 */
DALError.ofType = function (type = ERRORS.EXCEPTION, thrownException = {}) {
  let error = { type, body: null },
    originalErrMessage = thrownException.message ? `: ${ thrownException.message }` : '';
  switch (type) {
    case ERRORS.OFFLINE:
      error.status = 0;
      error.message = `Your connection was interrupted`;
      break;

    case ERRORS.TIMEOUT:
      error.status = 0;
      error.message = `DAL operation timed out${ originalErrMessage }`;
      break;

    case ERRORS.OUT_OF_SYNC:
      error.status = 409;
      error.message = `Resource is out of sync${ originalErrMessage }`;
      break;

    case ERRORS.RATE_LIMITED:
      error.status = 429;
      error.message = `Too many requests${ originalErrMessage }`;
      break;

    case ERRORS.STORAGE_DOM_QUOTA_EXCEEDED:
      error.status = 507; // Insufficient Storage
      error.message = `DAL failed to write to storage due to quota exceeded error${ originalErrMessage }`;
      break;

    case ERRORS.STORAGE_JSON_SERIALIZATION:
      error.status = 422; // Unprocessable Entity
      error.message = `DAL JSON serialization error${ originalErrMessage }`;
      break;

    case ERRORS.STORAGE_INACCESSIBLE:
      error.status = 423; // Locked
      error.message = `DAL could not access browser storage${ originalErrMessage }`;
      break;

    case ERRORS.STORAGE_NOT_CONFIGURED:
      error.status = 503; // Service Unavailable
      error.message = `DAL.Cache has not been configured! Access to storage is not yet available${ originalErrMessage }`;
      break;

    case ERRORS.EXCEPTION:
    default:
      error.status = 520; // Unknown Error
      error.message = `An unknown DALError occurred${ originalErrMessage }`;
  }

  return new DALError(Object.assign(thrownException, error));
};

export default DALError;


/** WEBPACK FOOTER **
 ** ./src/js/core/models/dal-error.js
 **/