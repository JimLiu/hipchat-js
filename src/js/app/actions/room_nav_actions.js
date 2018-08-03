/**
 * RoomNavActions
 */

var AppDispatcher = require('dispatchers/app_dispatcher');
var AnalyticsDispatcher = require('dispatchers/analytics_dispatcher');

var RoomNavActions = {

  /**
   * @param  {string} jid
   */
  select: function(jid, type) {
    var data = {
      jid: jid,
      type: type
    };
    AppDispatcher.dispatch('set-route', data);
    AnalyticsDispatcher.dispatch('analytics-select-room', data);
  },

  /**
   * @param  {string} jid
   */
  close: function(jid, type) {
    AppDispatcher.dispatch('close-room', {
      jid: jid,
      type: type
    });
  },

  closeSearchResults: function() {
    AppDispatcher.dispatch('close-room', {jid: "search"});
    AppDispatcher.dispatch('remove-search-nav-item');
  },

  openSearchResults: function() {
    AppDispatcher.dispatch('set-route', {
      jid: "search"
    });
  },

  openLobby: function() {
    var data = {
      jid: "lobby"
    };
    AppDispatcher.dispatch('set-route', {jid: 'lobby'});
    AnalyticsDispatcher.dispatch('analytics-select-room', data);
  },

  update_room_order: function(room_jids) {
    AppDispatcher.dispatch('update-room-order', room_jids);
  },

  dragStart: function(data) {
    AppDispatcher.dispatch('rooms-nav-drag-start', {
      target: data.target
    });
  },

  dragOver: function(data) {
    AppDispatcher.dispatch('rooms-nav-drag-over', {
      event: data.event
    });
  },

  dragEnd: function () {
    AppDispatcher.dispatch('rooms-nav-drag-end');
  }

};

module.exports = RoomNavActions;


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/room_nav_actions.js
 **/