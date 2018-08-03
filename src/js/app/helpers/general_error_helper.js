var AppDispatcher = require("dispatchers/app_dispatcher");

var errorsToHandle = ["500", "403"];

module.exports = function(stanza) {
  if (stanza.error && stanza.error.code && _.includes(errorsToHandle, stanza.error.code)) {
    AppDispatcher.dispatch("general-error", stanza);
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/general_error_helper.js
 **/