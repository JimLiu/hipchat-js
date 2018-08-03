/**
 * Room Dropdown Actions
 */

var AppDispatcher = require('dispatchers/app_dispatcher');

module.exports = {

  editTopic: function () {
    AppDispatcher.dispatch('edit-topic');
  },

  deleteRoom: function (data, cb) {
    AppDispatcher.dispatch('delete-room', {
      jid: data.jid,
      id: data.id
    }, cb);
  },

  closeRoom: function(jid) {
    AppDispatcher.dispatch('close-room', {
      jid: jid,
      doNotNotifyHC: true
    });
  },

  archiveRoom: function (data, cb) {
    AppDispatcher.dispatch('archive-room', {
      jid: data.jid,
      id: data.id
    }, cb);
  },

  unarchiveRoom: function (data, cb) {
    AppDispatcher.dispatch('unarchive-room', {
      jid: data.jid,
      id: data.id
    }, cb);
  },

  enableGuestAccess: function (data, cb) {
    AppDispatcher.dispatch('set-guest-access', {
      jid: data.jid,
      enable: true
    }, cb);
  },

  disableGuestAccess: function (data, cb) {
    AppDispatcher.dispatch('set-guest-access', {
      jid: data.jid,
      enable: false
    }, cb);
  }

};


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/room_dropdown_actions.js
 **/