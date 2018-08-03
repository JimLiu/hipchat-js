/**
 * FlagActions
 */

var AppDispatcher = require('dispatchers/app_dispatcher');

var FlagActions = {

  showFlag: function (flag_data) {
    AppDispatcher.dispatch('show-flag', flag_data);
  },

  removeFlag: function(flag_index) {
    AppDispatcher.dispatch('remove-flag', flag_index);
  },

  dismissAlertFlag: function() {
    AppDispatcher.dispatch('dismiss-alert-flag');
  }
};

module.exports = FlagActions;



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/flag_actions.js
 **/