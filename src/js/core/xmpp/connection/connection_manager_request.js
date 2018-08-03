import spi from "spi";

/**
 * Monkey-patches Strophe.Request
 *
 * Strophe.Request is called internally throughout Strophe.Connection for XHRs.
 * In order to modify that logic, we either have to rewrite all of Strophe.Connection's
 * methods that call it or overwrite Strophe.Request directly... which we're doing here
 * (sadplanet)
 */
var originalXHRFactory = Strophe.Request.prototype._newXHR;

Strophe.Request.prototype._newXHR = function() {

  var xhr = (originalXHRFactory.bind(this))(),
      originalOnReadyStateChange = xhr.onreadystatechange;

  /**
   *
   * This _customTimeout method allows us to notify the wrapper
   * when the network appears to be up, but requests are timing out
   *
   */
  xhr._customTimeout = xhr.ontimeout;
  xhr.ontimeout = function () {
    spi.onHostRequestTimeout();
    if (xhr._customTimeout) {
      xhr._customTimeout.apply(xhr, arguments);
    }
  };

  xhr.send = (function () {
    return function () {
      try {
        return XMLHttpRequest.prototype.send.apply(xhr, arguments);
      } catch (err) {
        return Strophe.warn(err.message);
      }
    };
  })(this);

  xhr.onreadystatechange = function() {
    if (this.readyState === 1 && !this.withCredentials) {
      this.withCredentials = true;
    }
    return originalOnReadyStateChange.apply(this, arguments);
  };

  return xhr;
};


/** WEBPACK FOOTER **
 ** ./src/js/core/xmpp/connection/connection_manager_request.js
 **/