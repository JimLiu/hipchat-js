/**
 * LobbyActions
 */

var AppDispatcher = require('dispatchers/app_dispatcher');
var AnalyticsDispatcher = require('dispatchers/analytics_dispatcher');
var AnalyticsActions = require('actions/analytics_actions');

var LobbyActions = {

  /**
   * @param  {object} data
   */
  applyFilter: function(data) {
    AppDispatcher.dispatch('filter-lobby', data);
    AnalyticsDispatcher.dispatch('analytics-filter-lobby', data);
  },

  openChat: function(data) {
    AppDispatcher.dispatch('set-route', {jid: data.jid});
    data.source = "lobby";
    AnalyticsDispatcher.dispatch('analytics-open-room', data);
  },

  resetFilter: function() {
    AppDispatcher.dispatch('set-lobby-filter-text', {text: ''});
    AppDispatcher.dispatch('filter-lobby', {
      query: "",
      scope: "all"
    });
  },

  showCreateRoomDialog: function() {
    // Old inconsistent event.
    AnalyticsDispatcher.dispatch("analytics-event", {
      name: "hipchat.client.lobby.create.room.dialog.open"
    });
    AnalyticsActions.createRoomClickedEvent("lobby");
    AppDispatcher.dispatch("show-modal-dialog", {
      dialog_type: "create-room-dialog",
      dialog_data: false
    });
  },

  lobbyMounted: function() {
    AnalyticsDispatcher.dispatch('analytics-lobby-mount', {id: 'lobby'});
  },

  setInputText: function(text) {
    AppDispatcher.dispatch('set-lobby-filter-text', {text: text});
  },

  resetSelectedItem: function() {
    AppDispatcher.dispatch('lobby-reset-selected-item');
  },

  itemHovered: function(data) {
    AppDispatcher.dispatch('lobby-item-hover', {
      index: data.index
    });
  },

  selectedNextItem: function() {
    AppDispatcher.dispatch('lobby-select-next-item');
  },

  selectedPrevItem: function() {
    AppDispatcher.dispatch('lobby-select-prev-item');
  }
};

module.exports = LobbyActions;


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/lobby_actions.js
 **/