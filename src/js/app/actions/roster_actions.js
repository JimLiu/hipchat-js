/**
 * LobbyRosterActions
 */

var AppDispatcher = require('dispatchers/app_dispatcher');

var LobbyRosterActions = {

  fetchPresence: function() {
    AppDispatcher.dispatch('fetch-presence');
  }

};

module.exports = LobbyRosterActions;


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/roster_actions.js
 **/