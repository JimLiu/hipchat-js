var Store = require('lib/core/store'),
    AppDispatcher = require("dispatchers/app_dispatcher");

class GeneralErrorsStore extends Store {

  getDefaults() {
    return {
      errors: [],
      web_server: ''
    };
  }

  registerListeners() {
    AppDispatcher.register({
      "general-error": (error) => {
        var errors = this.data.errors;
        errors.push(error);
        this.set('errors', errors);
      },
      'updated:web_server': (server) => {
        this.data.web_server = server;
      }
    });
  }
}

module.exports = new GeneralErrorsStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/general_errors_store.js
 **/