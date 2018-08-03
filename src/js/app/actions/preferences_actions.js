var AppDispatcher = require("dispatchers/app_dispatcher");

module.exports = {

  savePreferences: function(data) {
    AppDispatcher.dispatch("save-preferences", data);
  },

  addRoomToIntegrationDiscoveryIgnoreList: function(roomId) {
    AppDispatcher.dispatch("add-room-integration-discovery-ignore-list", roomId);
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/preferences_actions.js
 **/