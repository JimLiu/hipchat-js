/**
 * KeyboardShortcutActions
 */

import AnalyticsActions from 'actions/analytics_actions';
import api from 'api/api';

export default {

  openLobby: function () {
    api.openLobby();
    AnalyticsActions.lobbyFocusedWithKeyboardShortcut();
  },

  createRoom: function () {
    api.createRoom();
    AnalyticsActions.createRoomClickedEvent("keyboard.shortcut");
  },

  inviteUsersToRoom: function () {
    api.inviteUsersToRoom();
  },

  searchHistory: function () {
    api.focusSearch();
  },

  closeRoom: function () {
    api.closeActiveChat();
  },

  navigateRoomsUp: function () {
    api.navigateChatUp();
  },

  navigateRoomsDown: function () {
    api.navigateChatDown();
  },

  openSettings: function () {
    api.openSettings();
  },

  markChatsAsRead: function () {
    api.markChatsAsRead();
  },

  markRoomsAsRead: function () {
    api.markRoomsAsRead();
  },

  toggleSoundNotifications: function () {
    api.toggleSoundNotifications();
  },

  reopenLastChat: function () {
    api.reopenLastChat();
  },

  recallOlderInputHistory: function (e) {
    api.recallOlderInputHistory(e);
  },

  recallNewerInputHistory: function (e) {
    api.recallNewerInputHistory(e);
  }

};


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/keyboard_shortcut_actions.js
 **/