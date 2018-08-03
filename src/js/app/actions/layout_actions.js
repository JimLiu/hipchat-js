/**
 * MainLayoutActions
 */

import AppDispatcher from 'dispatchers/app_dispatcher';
import ClientPreferencesKeys from 'keys/client_preferences_keys';

export default {

  setLeftSidebarVisibility: function (visibility) {
    let data = {
      [ClientPreferencesKeys.SHOW_NAVIGATION_SIDEBAR]: visibility
    };
    AppDispatcher.dispatch("save-preferences", data);
    AppDispatcher.dispatch("left-column-width-updated");
  },

  setRightChatSidebarVisibility: function (visibility) {
    let data = {
      [ClientPreferencesKeys.SHOW_CHAT_SIDEBAR]: visibility
    };
    AppDispatcher.dispatch("save-preferences", data);
  },

  setRightGroupChatSidebarVisibility: function (visibility) {
    let data = {
      [ClientPreferencesKeys.SHOW_GROUPCHAT_SIDEBAR]: visibility
    };
    AppDispatcher.dispatch("save-preferences", data);
  },

  saveLeftColumnWidth: function (width) {
    let data = {
      [ClientPreferencesKeys.LEFT_COLUMN_WIDTH]: width
    };
    AppDispatcher.dispatch("save-preferences", data);
    AppDispatcher.dispatch("left-column-width-updated");
  },

  saveRightColumnWidth: function (width) {
    let data = {
      [ClientPreferencesKeys.RIGHT_COLUMN_WIDTH]: width
    };
    AppDispatcher.dispatch("save-preferences", data);
    AppDispatcher.dispatch("right-column-width-updated");
  },

  setRightColumnWidthIsChanging: function (changing) {
    AppDispatcher.dispatch("set-right-sidebar-visible-width-is-changing", changing);
  }

};


/** WEBPACK FOOTER **
 ** ./src/js/app/actions/layout_actions.js
 **/